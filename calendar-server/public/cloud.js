const savedDisplaySize=read('calendar.displaySize','1');
const displaySizes=['0.8','0.9','1','1.1'];
function applyDisplaySize(value){document.documentElement.style.setProperty('--calendar-scale',value);$('displaySize').value=value;}
applyDisplaySize(displaySizes.includes(savedDisplaySize)?savedDisplaySize:'1');
$('displaySize').onchange=()=>{const value=$('displaySize').value;if(!displaySizes.includes(value))return;applyDisplaySize(value);try{localStorage.setItem('calendar.displaySize',JSON.stringify(value));}catch{status('화면 크기를 적용했지만 이 기기에 기억하지 못했습니다.','error');}};
'use strict';
let cloudVersion=0, cloudBusy=false, cloudReady=false;
async function api(path,method='GET',data){
  const response=await fetch('/api/'+path,{method,credentials:'same-origin',headers:method==='GET'?{}:{'Content-Type':'application/json'},body:data===undefined?undefined:JSON.stringify(data),signal:AbortSignal.timeout(25000)});
  const result=await response.json();
  if(!response.ok)throw Error(result.error||'서버 요청 실패');
  return result;
}
function status(message,state='ok'){
  $('cloudStatus').textContent=message;
  $('cloudBadge').textContent=state==='error'?'확인 필요':state==='busy'?'저장 중':'연결됨';
  $('cloudBadge').dataset.state=state;
  if(state==='error')$('cloudPanel').open=true;
}
async function cloudLoad(){
  if(cloudBusy)return;
  cloudBusy=true;
  try{
    const data=await api('state');
    cloudVersion=data.version;events=data.events;holidayOverrides=data.holidayOverrides;
    cloudReady=true;render();
    status('서버 연결됨 · '+new Date().toLocaleTimeString('ko-KR')+' 확인');
    return true;
  }catch(error){status(error.message,'error');return false;}finally{cloudBusy=false;}
}
async function cloudSave(nextEvents,nextOverrides){
  if(!cloudReady||cloudBusy){status('연결 또는 저장이 진행 중입니다. 잠시 후 다시 시도하세요.','error');return false;}
  cloudBusy=true;status('서버에 저장 중…','busy');
  try{
    const result=await api('state','PUT',{version:cloudVersion,events:nextEvents,holidayOverrides:nextOverrides});
    cloudVersion=result.version;status('서버 저장 완료 · '+new Date().toLocaleTimeString('ko-KR'));return true;
  }catch(error){status(error.message,'error');$('notice').textContent=error.message;$('holidayNotice').textContent=error.message;return false;}finally{cloudBusy=false;}
}
$('reloadCloud').onclick=()=>cloudLoad();
$('exportData').onclick=()=>{
  if(!cloudReady){status('서버 자료를 먼저 불러와 주세요.');return;}
  const blob=new Blob([JSON.stringify({events,holidayOverrides},null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='calendar-backup-'+key(new Date())+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
};
$('importData').onclick=()=>$('importFile').click();
$('importFile').onchange=async()=>{
  const file=$('importFile').files[0];if(!file)return;
  try{
    if(file.size>2_000_000)throw Error('백업 파일은 2MB 이하여야 합니다.');
    const data=JSON.parse(await file.text());
    if(!Array.isArray(data.events)||!data.holidayOverrides||typeof data.holidayOverrides!=='object')throw Error('올바른 달력 백업 파일이 아닙니다.');
    if(!confirm('백업의 일정과 공휴일 수정 내용으로 서버의 전체 데이터를 교체할까요? 먼저 현재 데이터를 백업하는 것을 권장합니다.'))return;
    if(await cloudSave(data.events,data.holidayOverrides)){events=data.events;holidayOverrides=data.holidayOverrides;render();}
  }catch(error){status(error.message,'error');}finally{$('importFile').value='';}
};
setInterval(()=>{if(!document.hidden&&!document.querySelector('dialog[open]'))cloudLoad();},30000);
window.addEventListener('online',()=>{if(!document.querySelector('dialog[open]'))cloudLoad();});
window.addEventListener('beforeunload',e=>{if(cloudBusy){e.preventDefault();e.returnValue='';}});
cloudLoad();loadHolidays();
