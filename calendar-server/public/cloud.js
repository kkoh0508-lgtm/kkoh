'use strict';
let cloudVersion=0, cloudBusy=false, cloudReady=false;
async function api(path,method='GET',data){
  const response=await fetch('/api/'+path,{method,credentials:'same-origin',headers:method==='GET'?{}:{'Content-Type':'application/json'},body:data===undefined?undefined:JSON.stringify(data),signal:AbortSignal.timeout(25000)});
  const result=await response.json();
  if(!response.ok)throw Error(result.error||'서버 요청 실패');
  return result;
}
function status(message){$('cloudStatus').textContent=message;}
async function cloudLoad(){
  if(cloudBusy)return;
  cloudBusy=true;
  try{
    const data=await api('state');
    cloudVersion=data.version;events=data.events;holidayOverrides=data.holidayOverrides;
    cloudReady=true;render();
    status('서버 연결됨 · '+new Date().toLocaleTimeString('ko-KR')+' 확인');
    return true;
  }catch(error){status(error.message);return false;}finally{cloudBusy=false;}
}
async function cloudSave(nextEvents,nextOverrides){
  if(!cloudReady||cloudBusy){status('연결 또는 저장이 진행 중입니다. 잠시 후 다시 시도하세요.');return false;}
  cloudBusy=true;status('서버에 저장 중…');
  try{
    const result=await api('state','PUT',{version:cloudVersion,events:nextEvents,holidayOverrides:nextOverrides});
    cloudVersion=result.version;status('서버 저장 완료 · '+new Date().toLocaleTimeString('ko-KR'));return true;
  }catch(error){status(error.message);$('notice').textContent=error.message;$('holidayNotice').textContent=error.message;return false;}finally{cloudBusy=false;}
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
  }catch(error){status(error.message);}finally{$('importFile').value='';}
};
setInterval(()=>{if(!document.hidden&&!document.querySelector('dialog[open]'))cloudLoad();},30000);
window.addEventListener('online',()=>{if(!document.querySelector('dialog[open]'))cloudLoad();});
window.addEventListener('beforeunload',e=>{if(cloudBusy){e.preventDefault();e.returnValue='';}});
cloudLoad();loadHolidays();
