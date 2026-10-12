#!/bin/sh
# Đo Lighthouse (mobile, 3 lần lấy trung vị) — dùng: sh scripts/lighthouse.sh / /thuc-don
# Cần web (3001) + API đang chạy bản build production. Kết quả JSON nằm trong lighthouse/ (không đưa lên git).
export CHROME_PATH="${CHROME_PATH:-C:/Program Files/Google/Chrome/Application/chrome.exe}"
BASE="${BASE:-http://localhost:3001}"
mkdir -p lighthouse
for p in "$@"; do
  n=$(echo "$p" | tr '/' '_')
  for run in 1 2 3; do
    npx -y lighthouse@12 "$BASE$p" --quiet --chrome-flags="--headless=new" --only-categories=performance,accessibility,best-practices,seo --output=json --output-path="lighthouse/mobile$n-$run.json" >/dev/null 2>&1
  done
  node -e "
    const runs=[1,2,3].map(i=>require('./lighthouse/mobile$n-'+i+'.json'));
    const med=a=>a.sort((x,y)=>x-y)[1];
    const c=k=>Math.round(med(runs.map(r=>r.categories[k].score*100)));
    const m=k=>(med(runs.map(r=>r.audits[k].numericValue))/1000).toFixed(2);
    console.log('$p  Perf',c('performance'),'| A11y',c('accessibility'),'| BP',c('best-practices'),'| SEO',c('seo'),'|| LCP',m('largest-contentful-paint')+'s FCP',m('first-contentful-paint')+'s TBT',(m('total-blocking-time')*1000).toFixed(0)+'ms CLS',(med(runs.map(r=>r.audits['cumulative-layout-shift'].numericValue))).toFixed(3));
  "
done
