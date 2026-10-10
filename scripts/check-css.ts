async function checkCss() {
  const r = await fetch('https://roomiee-eight.vercel.app');
  const html = await r.text();
  const cssRegex = /href="(\/_next\/static\/[^"]+\.css)"/g;
  let match;
  const list = [];
  while ((match = cssRegex.exec(html)) !== null) {
    list.push(match[1]);
  }
  console.log('CSS links found:', list);
  for (const href of list) {
    const res = await fetch('https://roomiee-eight.vercel.app' + href);
    console.log(href, 'Status:', res.status, res.headers.get('content-type'), 'Length:', (await res.text()).length);
  }
}
checkCss();
