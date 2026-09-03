//! Print the Layers lexicon VCS log and confirm v0.9.0 resolves.

use anyhow::{Context, Result};
use panproto_vcs::{Repository, Store, refs, store};
use std::path::Path;

fn main() -> Result<()> {
    let repo = Repository::open(Path::new(
        "/Users/awhite48/Projects/layers-pub/layers-0.9.0/lexicons",
    ))
    .context("open repo")?;

    let commits = repo.log(None).context("log")?;
    println!("commits: {}", commits.len());

    let mut tags = refs::list_tags(repo.store()).context("tags")?;
    tags.sort_by(|a, b| a.0.cmp(&b.0));
    for (name, cid) in &tags {
        println!("tag {name} -> {}", &cid.to_string()[..12]);
    }

    let head = store::resolve_head(repo.store())
        .context("head")?
        .context("head empty")?;
    println!("HEAD -> {}", &head.to_string()[..12]);
    let v9 = refs::resolve_ref(repo.store(), "v0.9.0").context("resolve v0.9.0")?;
    println!("v0.9.0 tag resolves to commit {}", &v9.to_string()[..12]);
    println!("HEAD == v0.9.0: {}", head == v9);
    Ok(())
}
