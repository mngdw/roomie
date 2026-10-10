const token = process.env.VERCEL_TOKEN || '';
const teamId = 'team_8Hgec7awlmjbB32jyuubwAZl';
const projectId = 'prj_j39cDLdYW7zQ9W6XKtuIXi4hWmJM';

async function main() {
  console.log('1. Setting DATABASE_URL environment variable...');
  // Note: Vercel serverless uses IPv4 session pooler
  const poolerUrl = 'postgresql://postgres.pdikiegygpmphljioepy:uH2t7klyNnatHFoV@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres';

  console.log('2. Checking / Updating Project Settings...');
  // Ensure deployment protection is disabled
  const patchRes = await fetch(`https://api.vercel.com/v9/projects/${projectId}?teamId=${teamId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      ssoProtection: null
    })
  });
  console.log('Project update status:', patchRes.status);

  console.log('3. Triggering a fresh Deployment with latest commit from main...');
  const deployRes = await fetch(`https://api.vercel.com/v13/deployments?teamId=${teamId}&forceNew=1`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: 'roomiee',
      project: projectId,
      target: 'production',
      gitSource: {
        type: 'github',
        repo: 'mngdw/roomiee',
        repoId: 1413336718,
        ref: 'main'
      }
    })
  });
  const deployData = await deployRes.json();
  console.log('Deployment Result:', deployData);
}

main().catch(console.error);
