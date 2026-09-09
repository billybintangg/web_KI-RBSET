const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const source = fs.readFileSync('api/analytics.js', 'utf8');
async function request({ env = {}, method = 'GET', fail = false, empty = false } = {}) {
  const context = { module: { exports: {} }, Buffer, process: { env }, console: { error() {} }, require() {
    return { BetaAnalyticsDataClient: class { async runReport(query) {
      if (fail) throw new Error('upstream failed');
      if (empty) return [{}];
      return [query.dimensions ? { rows: [
        { dimensionValues: [{value:'Indonesia'}, {value:'ID'}], metricValues:[{value:'8'}] },
        { dimensionValues: [{value:'Singapore'}, {value:'SG'}], metricValues:[{value:'5'}] },
        { dimensionValues: [{value:'Unknown'}, {value:'(not set)'}], metricValues:[{value:'1'}] },
      ] } : { rows: [{ metricValues: [{value:'10'}] }] }];
    } } };
  } };
  vm.runInNewContext(source, context);
  const res = { headers: {}, setHeader(k,v) {this.headers[k]=v}, status(v) {this.statusCode=v; return this}, json(v) {this.body=v; return this} };
  await context.module.exports({method},res);
  return res;
}
const env = { GA_PROPERTY_ID:'123', GA_CLIENT_EMAIL:'test@example.test', GA_PRIVATE_KEY_BASE64: Buffer.from('test').toString('base64') };
test('missing configuration returns safe noncached error', async()=> {const r=await request(); assert.equal(r.statusCode,503); assert.equal(r.headers['Cache-Control'],'no-store');});
test('unsupported method rejected',async()=> {assert.equal((await request({method:'POST'})).statusCode,405)});
test('overall total is not sum of countries; unknown is not counted as a country',async()=> {const r=await request({env}); assert.equal(r.statusCode,200); assert.equal(r.body.totalUsers,10); assert.equal(r.body.totalCountries,2); assert.equal(r.body.countries.length,3)});
test('empty report returns zero',async()=> {const r=await request({env,empty:true}); assert.equal(r.body.totalUsers,0); assert.equal(r.body.totalCountries,0)});
test('upstream failure returns safe noncached error',async()=> {const r=await request({env,fail:true}); assert.equal(r.statusCode,502); assert.equal(r.headers['Cache-Control'],'no-store')});
test('inline scripts parse and retry handler exists',()=> {const html=fs.readFileSync('index.html','utf8'); for(const match of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)) new vm.Script(match[1]); assert.match(html,/getElementById\("analytics-retry"\).addEventListener/)});
