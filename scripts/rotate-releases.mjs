/**
 * Rotación automática de respaldos en GitHub Releases
 * Conserva estrictamente las 3 versiones más recientes y purga las anteriores.
 */
async function main() {
  const repo = process.env.GITHUB_REPOSITORY;
  const token = process.env.GITHUB_TOKEN;

  if (!repo || !token) {
    console.log('Aviso: GITHUB_REPOSITORY o GITHUB_TOKEN no configurado, omitiendo rotación.');
    return;
  }

  console.log(`🔍 Consultando releases de respaldo en ${repo}...`);
  const res = await fetch(`https://api.github.com/repos/${repo}/releases?per_page=20`, {
    headers: {
      Authorization: `token ${token}`,
      Accept: 'application/vnd.github.v3+json',
    },
  });

  if (!res.ok) {
    console.warn(`Aviso: No se pudieron obtener releases (${res.status})`);
    return;
  }

  const releases = await res.json();
  const backupReleases = releases.filter((r) => r.tag_name && r.tag_name.startsWith('backup-'));
  console.log(`📦 Releases de respaldo encontrados: ${backupReleases.length}`);

  const maxVersions = 3;
  if (backupReleases.length > maxVersions) {
    const toDelete = backupReleases.slice(maxVersions);
    console.log(`♻️ Purgando ${toDelete.length} release(s) anterior(es) para mantener solo las 3 más recientes...`);

    for (const rel of toDelete) {
      const delRes = await fetch(`https://api.github.com/repos/${repo}/releases/${rel.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `token ${token}`,
          Accept: 'application/vnd.github.v3+json',
        },
      });

      if (delRes.ok) {
        console.log(`   🗑️ Release eliminado: ${rel.tag_name} (${rel.name})`);
        // Borrar el tag asociado
        await fetch(`https://api.github.com/repos/${repo}/git/refs/tags/${rel.tag_name}`, {
          method: 'DELETE',
          headers: {
            Authorization: `token ${token}`,
            Accept: 'application/vnd.github.v3+json',
          },
        }).catch(() => {});
      }
    }
  } else {
    console.log(`✅ Los respaldos están dentro del límite permitido (<= ${maxVersions}).`);
  }
}

main().catch((err) => {
  console.error('Error en rotación de releases:', err);
});
