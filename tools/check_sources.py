"""Read-only link inspection; outputs observations, never changes claims or guide.md."""
import argparse, hashlib, json, re, time
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlsplit
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError
from urllib.robotparser import RobotFileParser

ROOT=Path(__file__).resolve().parents[1]
AGENT='FEGuideResearch/0.1'
MAX_BYTES=4*1024*1024

def inspect(source, policies):
    url=source['url']; host=urlsplit(url)
    result={'sourceId':source['id'],'url':url,'checkedAt':datetime.now(timezone.utc).isoformat(),'claimStatus':'unreviewed'}
    base=f'{host.scheme}://{host.netloc}'
    if base not in policies:
        robots=RobotFileParser(); robots.set_url(base+'/robots.txt')
        try:
            with urlopen(Request(base+'/robots.txt',headers={'User-Agent':AGENT}),timeout=12) as response:
                robots.parse(response.read(512*1024).decode('utf-8',errors='replace').splitlines())
            policies[base]=robots
        except HTTPError as error:
            policies[base]=True if error.code==404 else None
        except (URLError,TimeoutError,OSError):
            policies[base]=None
    policy=policies[base]
    if policy is None:
        return dict(result,status='robots-unavailable',note='Robots policy could not be checked. No page request made.')
    if policy is not True and not policy.can_fetch(AGENT,url):
        return dict(result,status='robots-disallowed')
    try:
        with urlopen(Request(url,headers={'User-Agent':AGENT}),timeout=15) as response:
            payload=response.read(MAX_BYTES+1)
            if len(payload)>MAX_BYTES:return dict(result,status='too-large')
            charset=response.headers.get_content_charset() or 'utf-8'
            text=payload.decode(charset,errors='replace')
            title=re.search(r'<title[^>]*>(.*?)</title>',text,re.S|re.I)
            return dict(result,status='retrieved',httpStatus=response.status,finalUrl=response.url,title=re.sub(r'\s+',' ',title[1]).strip() if title else None,contentHash=hashlib.sha256(payload).hexdigest(),note='HTTP success and a hash are observations only; they do not verify any game claim.')
    except HTTPError as error:
        return dict(result,status='limited' if error.code in (401,402,403,429) else 'http-error',httpStatus=error.code)
    except (URLError,TimeoutError,OSError,LookupError) as error:
        return dict(result,status='unavailable',note=type(error).__name__)

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check',action='store_true',help='Perform network requests. Without this flag, only list selected URLs.')
    parser.add_argument('--host',help='Exact hostname, such as gamewith.jp')
    parser.add_argument('--limit',type=int,default=5)
    parser.add_argument('--out',type=Path,default=ROOT/'research'/'latest-check.json')
    args=parser.parse_args()
    if args.limit<1:parser.error('--limit must be at least 1')
    sources=json.loads((ROOT/'source'/'sources.json').read_text())
    selected=[s for s in sources if not args.host or s['host']==args.host][:args.limit]
    if not args.check:
        for source in selected:print(source['id'],source['url'])
        return
    policies={}; results=[]
    for index,source in enumerate(selected):
        if index:time.sleep(1)
        result=inspect(source,policies);results.append(result)
        print(result['status'],source['url'])
    args.out.parent.mkdir(parents=True,exist_ok=True)
    args.out.write_text(json.dumps({'checkedAt':datetime.now(timezone.utc).isoformat(),'observations':results},ensure_ascii=False,indent=2)+'\n')
    print('Saved observations to',args.out)

if __name__=='__main__':main()
