//! Composable TS fragments shared by the frontend emitters.
//!
//! Each `*_fragment` function takes a small typed spec and returns a
//! `Vec<TsItem>` describing the chunk it produces. Emitters compose
//! these fragments into a [`TsModule`] without ever concatenating raw
//! TypeScript strings. Adding a new generated shape means: (1)
//! describe its inputs as a struct here, (2) write a builder that
//! returns `Vec<TsItem>`, (3) call it from the relevant emitter.

use super::ts::{TsItem, TsParam};

/// Spec for one read query hook (a `getX` or `listX` route).
pub struct QueryHookSpec<'a> {
    pub lxm: &'a str,
    pub namespace: &'a str,
    pub method_camel: &'a str,
    pub method_pascal: &'a str,
    /// True when the route accepts a `cursor` param. Drives whether
    /// an additional `useInfinite<X>` hook is emitted.
    pub paginated: bool,
}

/// One key-factory entry rendered into the namespace's `QueryKeys`
/// const (the `<methodCamel>: (params) => […] as const` line).
pub struct KeysFactoryEntry {
    pub method_camel: String,
    pub params_alias: String,
    pub lxm: String,
}

impl KeysFactoryEntry {
    pub fn render_member(&self) -> String {
        format!(
            "/** Cache key for `{lxm}`. */\n  {camel}: (params: {alias}) => ['xrpc', '{lxm}', params] as const",
            lxm = self.lxm,
            camel = self.method_camel,
            alias = self.params_alias,
        )
    }
}

/// Fragment for a single XRPC GET method: path constant, params
/// type, response type, fetcher, useQuery hook (and optionally a
/// useInfiniteQuery hook for cursor-paginated lists).
pub fn query_hook_fragment(spec: &QueryHookSpec<'_>) -> (Vec<TsItem>, KeysFactoryEntry) {
    let path_const = path_const_name(spec.method_camel);
    let route_path = format!("/xrpc/{}", spec.lxm);
    let params_alias = format!("{}Params", spec.method_pascal);
    let response_alias = format!("{}Response", spec.method_pascal);

    let mut items: Vec<TsItem> = Vec::new();
    items.push(TsItem::Const {
        doc: None,
        exported: false,
        name: path_const.clone(),
        annotation: None,
        value: format!("'{route_path}' as const"),
    });
    items.push(TsItem::TypeAlias {
        doc: Some(format!(
            "Query parameters for `{lxm}`, typed against the OpenAPI schema.",
            lxm = spec.lxm
        )),
        exported: true,
        name: params_alias.clone(),
        body: format!("NonNullable<paths[typeof {path_const}]['get']['parameters']['query']>"),
    });
    items.push(TsItem::TypeAlias {
        doc: Some(format!("Response body for `{lxm}`.", lxm = spec.lxm)),
        exported: true,
        name: response_alias.clone(),
        body: format!(
            "paths[typeof {path_const}]['get']['responses']['200']['content']['application/json']"
        ),
    });
    items.push(TsItem::Function {
        doc: Some(format!(
            "Typed fetcher for `{lxm}`. Throws on non-2xx.",
            lxm = spec.lxm
        )),
        exported: true,
        is_async: true,
        name: spec.method_camel.to_owned(),
        params: vec![TsParam::new("params", params_alias.clone())],
        return_type: Some(format!("Promise<{response_alias}>")),
        body: format!(
            "const {{ data, error }} = await api.GET({path_const}, {{ params: {{ query: params }} }});\nif (error) throw error;\nreturn data as {response_alias};"
        ),
    });
    items.push(TsItem::Function {
        doc: Some(format!(
            "TanStack Query hook for `{lxm}`.",
            lxm = spec.lxm
        )),
        exported: true,
        is_async: false,
        name: format!("use{}", spec.method_pascal),
        params: vec![
            TsParam::new("params", params_alias.clone()),
            TsParam::new(
                "options",
                format!(
                    "Omit<UseQueryOptions<{response_alias}>, 'queryKey' | 'queryFn'>"
                ),
            )
            .optional(),
        ],
        return_type: None,
        body: format!(
            "return useQuery<{response_alias}>({{\n  queryKey: {ns}QueryKeys.{camel}(params),\n  queryFn: () => {camel}(params),\n  ...options,\n}});",
            ns = spec.namespace,
            camel = spec.method_camel,
        ),
    });

    if spec.paginated {
        items.push(infinite_hook_fragment(spec, &params_alias, &response_alias));
    }

    let keys_entry = KeysFactoryEntry {
        method_camel: spec.method_camel.to_owned(),
        params_alias,
        lxm: spec.lxm.to_owned(),
    };
    (items, keys_entry)
}

fn infinite_hook_fragment(
    spec: &QueryHookSpec<'_>,
    params_alias: &str,
    response_alias: &str,
) -> TsItem {
    let opts_type = format!(
        "Omit<\n  UseInfiniteQueryOptions<\n    {response_alias},\n    Error,\n    {response_alias},\n    readonly unknown[],\n    string | undefined\n  >,\n  'queryKey' | 'queryFn' | 'initialPageParam' | 'getNextPageParam'\n>"
    );
    let body = format!(
        "return useInfiniteQuery<\n  {response_alias},\n  Error,\n  {response_alias},\n  readonly unknown[],\n  string | undefined\n>({{\n  queryKey: ['xrpc', '{lxm}', params, '__infinite'] as const,\n  queryFn: ({{ pageParam }}) =>\n    {camel}({{ ...params, cursor: pageParam }} as {params_alias}),\n  initialPageParam: undefined,\n  getNextPageParam: (last) =>\n    (last as {{ cursor?: string }} | undefined)?.cursor ?? undefined,\n  ...options,\n}});",
        lxm = spec.lxm,
        camel = spec.method_camel,
    );
    TsItem::Function {
        doc: Some(format!(
            "Infinite-query hook for `{lxm}`. Pages by `cursor`.",
            lxm = spec.lxm
        )),
        exported: true,
        is_async: false,
        name: format!("useInfinite{}", spec.method_pascal),
        params: vec![
            TsParam::new("params", format!("Omit<{params_alias}, 'cursor'>")),
            TsParam::new("options", opts_type).optional(),
        ],
        return_type: None,
        body,
    }
}

/// Spec for a write-record mutation hook trio (Create / Update / Delete).
pub struct MutationHookSpec<'a> {
    pub nsid: &'a str,
    pub namespace: &'a str,
    pub pascal: &'a str,
}

/// Build the three mutation hooks for one record collection. Returns
/// the fragments in order Create, Update, Delete.
pub fn mutation_hook_fragments(spec: &MutationHookSpec<'_>) -> Vec<TsItem> {
    let invalidator = format!(
        "(q) => ((q.queryKey as readonly unknown[])[1] as string | undefined)?.startsWith('pub.layers.{ns}.') === true",
        ns = spec.namespace,
    );
    let mut items = Vec::new();
    items.push(TsItem::Function {
        doc: Some(format!(
            "Create a `{nsid}` record in the authenticated user's PDS.",
            nsid = spec.nsid
        )),
        exported: true,
        is_async: false,
        name: format!("useCreate{}", spec.pascal),
        params: vec![TsParam::new(
            "options",
            "UseMutationOptions<{ uri: string; cid: string }, Error, { rkey?: string; record: unknown }>",
        )
        .optional()],
        return_type: None,
        body: format!(
            "const writer = useRecordWriter();\nconst qc = useQueryClient();\nreturn useMutation({{\n  mutationFn: async ({{ rkey, record }}) =>\n    writer.putRecord({{\n      repo: writer.repoDid,\n      collection: '{nsid}',\n      rkey,\n      record,\n    }}),\n  onSuccess: () => {{\n    void qc.invalidateQueries({{ predicate: {pred} }});\n  }},\n  ...options,\n}});",
            nsid = spec.nsid,
            pred = invalidator,
        ),
    });
    items.push(TsItem::Function {
        doc: Some(format!(
            "Replace a `{nsid}` record by `rkey`.",
            nsid = spec.nsid
        )),
        exported: true,
        is_async: false,
        name: format!("useUpdate{}", spec.pascal),
        params: vec![TsParam::new(
            "options",
            "UseMutationOptions<{ uri: string; cid: string }, Error, { rkey: string; record: unknown }>",
        )
        .optional()],
        return_type: None,
        body: format!(
            "const writer = useRecordWriter();\nconst qc = useQueryClient();\nreturn useMutation({{\n  mutationFn: async ({{ rkey, record }}) =>\n    writer.putRecord({{\n      repo: writer.repoDid,\n      collection: '{nsid}',\n      rkey,\n      record,\n    }}),\n  onSuccess: () => {{\n    void qc.invalidateQueries({{ predicate: {pred} }});\n  }},\n  ...options,\n}});",
            nsid = spec.nsid,
            pred = invalidator,
        ),
    });
    items.push(TsItem::Function {
        doc: Some(format!(
            "Delete a `{nsid}` record by `rkey`.",
            nsid = spec.nsid
        )),
        exported: true,
        is_async: false,
        name: format!("useDelete{}", spec.pascal),
        params: vec![TsParam::new(
            "options",
            "UseMutationOptions<void, Error, { rkey: string }>",
        )
        .optional()],
        return_type: None,
        body: format!(
            "const writer = useRecordWriter();\nconst qc = useQueryClient();\nreturn useMutation({{\n  mutationFn: async ({{ rkey }}) =>\n    writer.deleteRecord({{\n      repo: writer.repoDid,\n      collection: '{nsid}',\n      rkey,\n    }}),\n  onSuccess: () => {{\n    void qc.invalidateQueries({{ predicate: {pred} }});\n  }},\n  ...options,\n}});",
            nsid = spec.nsid,
            pred = invalidator,
        ),
    });
    items
}

fn path_const_name(method_camel: &str) -> String {
    let mut out = String::from("PATH_");
    for ch in method_camel.chars() {
        if ch.is_uppercase() {
            if !out.ends_with("PATH_") {
                out.push('_');
            }
            out.extend(ch.to_lowercase().map(|c| c.to_ascii_uppercase()));
        } else {
            out.extend(ch.to_uppercase());
        }
    }
    out
}
