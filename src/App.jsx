import { useState, useEffect, useCallback, useRef } from "react";
import * as api from "./api.js";

const HOLIDAYS = {
  "2024-01-01":"元日","2024-01-08":"成人の日","2024-02-11":"建国記念の日","2024-02-12":"振替休日",
  "2024-02-23":"天皇誕生日","2024-03-20":"春分の日","2024-04-29":"昭和の日","2024-05-03":"憲法記念日",
  "2024-05-04":"みどりの日","2024-05-05":"こどもの日","2024-05-06":"振替休日","2024-07-15":"海の日",
  "2024-08-11":"山の日","2024-08-12":"振替休日","2024-09-16":"敬老の日","2024-09-22":"秋分の日",
  "2024-09-23":"振替休日","2024-10-14":"スポーツの日","2024-11-03":"文化の日","2024-11-04":"振替休日",
  "2024-11-23":"勤労感謝の日","2025-01-01":"元日","2025-01-13":"成人の日","2025-02-11":"建国記念の日",
  "2025-02-23":"天皇誕生日","2025-02-24":"振替休日","2025-03-20":"春分の日","2025-04-29":"昭和の日",
  "2025-05-03":"憲法記念日","2025-05-04":"みどりの日","2025-05-05":"こどもの日","2025-05-06":"振替休日",
  "2025-07-21":"海の日","2025-08-11":"山の日","2025-09-15":"敬老の日","2025-09-23":"秋分の日",
  "2025-10-13":"スポーツの日","2025-11-03":"文化の日","2025-11-23":"勤労感謝の日","2025-11-24":"振替休日",
  "2026-01-01":"元日","2026-01-12":"成人の日","2026-02-11":"建国記念の日","2026-02-23":"天皇誕生日",
  "2026-03-20":"春分の日","2026-04-29":"昭和の日","2026-05-03":"憲法記念日","2026-05-04":"みどりの日",
  "2026-05-05":"こどもの日","2026-05-06":"振替休日","2026-07-20":"海の日","2026-08-11":"山の日",
  "2026-09-21":"敬老の日","2026-09-22":"国民の休日","2026-09-23":"秋分の日","2026-10-12":"スポーツの日",
  "2026-11-03":"文化の日","2026-11-23":"勤労感謝の日",
};

function isHoliday(d){return!!HOLIDAYS[d];}
function getHolidayName(d){return HOLIDAYS[d]||"";}
function formatDate(iso){return new Date(iso).toLocaleDateString("ja-JP",{year:"numeric",month:"long",day:"numeric",weekday:"short"});}
function formatTime(iso){return new Date(iso).toLocaleTimeString("ja-JP",{hour:"2-digit",minute:"2-digit"});}
function formatDateTime(iso){return`${formatDate(iso)} ${formatTime(iso)}`;}
function groupByDate(slots){const map={};slots.forEach(s=>{const day=s.start.slice(0,10);if(!map[day])map[day]=[];map[day].push(s);});return map;}
function calcEndTime(dateStr,startTime,duration){
  if(!dateStr||!startTime||!duration)return"";
  const[h,m]=startTime.split(":").map(Number);const total=h*60+m+parseInt(duration);
  return`${String(Math.floor(total/60)).padStart(2,"0")}:${String(total%60).padStart(2,"0")}`;
}

function MiniCalendar({value,onChange}){
  const today=new Date();
  const[viewYear,setViewYear]=useState(value?parseInt(value.slice(0,4)):today.getFullYear());
  const[viewMonth,setViewMonth]=useState(value?parseInt(value.slice(5,7))-1:today.getMonth());
  function prevMonth(){if(viewMonth===0){setViewMonth(11);setViewYear(y=>y-1);}else setViewMonth(m=>m-1);}
  function nextMonth(){if(viewMonth===11){setViewMonth(0);setViewYear(y=>y+1);}else setViewMonth(m=>m+1);}
  const firstDay=new Date(viewYear,viewMonth,1).getDay();
  const daysInMonth=new Date(viewYear,viewMonth+1,0).getDate();
  const cells=[];for(let i=0;i<firstDay;i++)cells.push(null);for(let d=1;d<=daysInMonth;d++)cells.push(d);
  const weekdays=["日","月","火","水","木","金","土"];
  return(
    <div style={{border:"1px solid #ddd",borderRadius:10,overflow:"hidden",userSelect:"none",background:"#fff",width:280}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",background:"#667eea",color:"#fff",padding:"10px 14px"}}>
        <button onClick={prevMonth} style={{background:"none",border:"none",color:"#fff",fontSize:18,cursor:"pointer"}}>&#8249;</button>
        <span style={{fontWeight:700,fontSize:15}}>{viewYear}年{viewMonth+1}月</span>
        <button onClick={nextMonth} style={{background:"none",border:"none",color:"#fff",fontSize:18,cursor:"pointer"}}>&#8250;</button>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",textAlign:"center"}}>
        {weekdays.map((w,i)=><div key={w} style={{padding:"6px 0",fontSize:12,fontWeight:700,color:i===0?"#e74c3c":i===6?"#3498db":"#555",background:"#f8f8f8"}}>{w}</div>)}
        {cells.map((d,i)=>{
          if(!d)return<div key={`e${i}`}/>;
          const mm=String(viewMonth+1).padStart(2,"0"),dd=String(d).padStart(2,"0");
          const dateStr=`${viewYear}-${mm}-${dd}`;
          const dow=(firstDay+d-1)%7,isHol=isHoliday(dateStr),holName=getHolidayName(dateStr);
          const isSelected=value===dateStr,isPast=new Date(dateStr)<new Date(today.toDateString());
          let color="#333";if(dow===0||isHol)color="#e74c3c";else if(dow===6)color="#3498db";if(isPast)color="#ccc";
          return(
            <div key={dateStr} title={holName||undefined} onClick={()=>!isPast&&onChange(dateStr)}
              style={{padding:"6px 2px",fontSize:12,cursor:isPast?"default":"pointer",color,fontWeight:isSelected?"700":"400",
                background:isSelected?"#667eea":isHol?"#fff5f5":"transparent",borderRadius:isSelected?6:0}}>
              {isSelected?<span style={{color:"#fff"}}>{d}</span>:d}
              {isHol&&<div style={{fontSize:8,color:"#e74c3c",lineHeight:1,marginTop:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:38}}>{holName}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function App(){
  const[mode,setMode]=useState("home");
  const[slots,setSlots]=useState([]);
  const[bookings,setBookings]=useState([]);
  const[isLoading,setIsLoading]=useState(false);
  const[error,setError]=useState("");
  const[adminPass,setAdminPass]=useState("");
  const[adminError,setAdminError]=useState("");
  const[isAdminLoggedIn,setIsAdminLoggedIn]=useState(false);
  const[hostEmails,setHostEmails]=useState("");
  const[hostEmailsSaved,setHostEmailsSaved]=useState(false);
  const[newSlotDate,setNewSlotDate]=useState("");
  const[newSlotStart,setNewSlotStart]=useState("");
  const[newSlotDuration,setNewSlotDuration]=useState("60");
  const newSlotEnd=calcEndTime(newSlotDate,newSlotStart,newSlotDuration);
  const[empName,setEmpName]=useState("");
  const[empEmail,setEmpEmail]=useState("");
  const[selected,setSelected]=useState([]);
  const[empStep,setEmpStep]=useState("form");
  const[myBooking,setMyBooking]=useState(null);
  const[changeSelected,setChangeSelected]=useState([]);
  const[notification,setNotification]=useState("");
  const[undoTarget,setUndoTarget]=useState(null); // {id, name} 削除取り消し用
  const undoTimerRef=useRef(null);
  const lastModifiedRef=useRef('0');

  const loadSlots=useCallback(async()=>{try{setSlots(await api.fetchSlots());}catch(e){console.error(e);}}, []);

  const loadAll=useCallback(async()=>{
    try{
      const data=await api.pollAdminData(lastModifiedRef.current);
      lastModifiedRef.current=data.lastModified;
      setBookings(data.bookings);
      setSlots(data.slots);
    }catch(e){console.error(e);}
  },[]);

  useEffect(()=>{loadSlots();},[loadSlots]);

  useEffect(()=>{
    if(!isAdminLoggedIn)return;
    (async()=>{
      try{
        const[settings]=await Promise.all([api.fetchSettings(),loadAll()]);
        setHostEmails(settings.hostEmails||'');
      }catch(e){console.error(e);}
    })();
  },[isAdminLoggedIn,loadAll]);

  useEffect(()=>{
    if(!isAdminLoggedIn)return;
    const iv=setInterval(loadAll,10000);
    return()=>clearInterval(iv);
  },[isAdminLoggedIn,loadAll]);

  useEffect(()=>{
    if(empStep!=="myStatus")return;
    const iv=setInterval(async()=>{
      if(empEmail){try{setMyBooking(await api.fetchBookingByEmail(empEmail));await loadSlots();}catch{}}
    },30000);
    return()=>clearInterval(iv);
  },[empStep,empEmail,loadSlots]);

  function showNotification(msg){setNotification(msg);setTimeout(()=>setNotification(""),4500);}

  async function adminLogin(){
    setAdminError("");setIsLoading(true);
    try{await api.adminLogin(adminPass);setIsAdminLoggedIn(true);}
    catch(e){setAdminError(e.message||"パスワードが違います");}
    finally{setIsLoading(false);}
  }

  async function saveHostEmails(){
    setIsLoading(true);
    try{
      await api.updateSettings({hostEmails});
      setHostEmailsSaved(true);
      setTimeout(()=>setHostEmailsSaved(false),3000);
      showNotification("ホストのメールアドレスを保存しました");
    }catch(e){setError(e.message);}
    finally{setIsLoading(false);}
  }

  async function addSlot(){
    if(!newSlotDate||!newSlotStart||!newSlotEnd)return;
    setIsLoading(true);setError("");
    try{
      await api.createSlot(`${newSlotDate}T${newSlotStart}:00`,`${newSlotDate}T${newSlotEnd}:00`);
      await loadAll();showNotification("面談枠を追加しました");setNewSlotStart("");
    }catch(e){setError(e.message);}finally{setIsLoading(false);}
  }

  async function deleteSlot(id){
    setIsLoading(true);
    try{await api.deleteSlot(id);await loadAll();showNotification("面談枠を削除しました");}
    catch(e){setError(e.message);}finally{setIsLoading(false);}
  }

  async function confirmBooking(bookingId,slotId){
    setIsLoading(true);setError("");
    try{
      const result=await api.confirmBookingSlot(bookingId,slotId);
      await loadAll();
      if(result._emailWarnings&&result._emailWarnings.length>0){
        showNotification("面談日時を確定しました。※メール送信に問題があります（Vercelログを確認）");
      }else{
        showNotification("面談日時を確定しました。メールを送信しました。");
      }
    }catch(e){setError(e.message);}finally{setIsLoading(false);}
  }

  async function submitEmpForm(){
    if(!empName||!empEmail)return;setIsLoading(true);setError("");
    try{
      const existing=await api.fetchBookingByEmail(empEmail);
      setMyBooking(existing);await loadSlots();setEmpStep("myStatus");
    }catch(e){
      if(e.status===404)setEmpStep("pick");else setError(e.message);
    }finally{setIsLoading(false);}
  }

  function toggleSelect(id){if(selected.includes(id))setSelected(selected.filter(s=>s!==id));else if(selected.length<3)setSelected([...selected,id]);}
  function toggleChangeSelect(id){if(changeSelected.includes(id))setChangeSelected(changeSelected.filter(s=>s!==id));else if(changeSelected.length<3)setChangeSelected([...changeSelected,id]);}

  async function submitPreferences(){
    if(selected.length===0)return;setIsLoading(true);setError("");
    try{
      const b=await api.createBooking({name:empName,email:empEmail,preferences:selected});
      setMyBooking(b);setEmpStep("done");
      showNotification(`${empName}さんの希望を受け付けました。`);
    }catch(e){setError(e.message);}finally{setIsLoading(false);}
  }

  async function submitChange(){
    if(changeSelected.length===0||!myBooking)return;setIsLoading(true);setError("");
    try{
      const updated=await api.changeBookingPreferences(myBooking.id,changeSelected,empEmail);
      setMyBooking(updated);await loadSlots();setEmpStep("done");
      showNotification("変更を受け付けました。メールを送信しました。");
    }catch(e){setError(e.message);}finally{setIsLoading(false);}
  }

  async function deleteBooking(bookingId, bookingName){
    setIsLoading(true);
    try{
      await api.deleteBooking(bookingId);
      await loadAll();
      // 元に戻すタイマーをセット（15秒）
      if(undoTimerRef.current)clearTimeout(undoTimerRef.current);
      setUndoTarget({id:bookingId,name:bookingName});
      undoTimerRef.current=setTimeout(()=>setUndoTarget(null),15000);
    }catch(e){setError(e.message);}finally{setIsLoading(false);}
  }

  async function undoDelete(){
    if(!undoTarget)return;
    setIsLoading(true);
    try{
      await api.restoreBooking(undoTarget.id);
      await loadAll();
      if(undoTimerRef.current)clearTimeout(undoTimerRef.current);
      setUndoTarget(null);
      showNotification(`${undoTarget.name}さんのデータを復元しました`);
    }catch(e){setError(e.message);}finally{setIsLoading(false);}
  }

  async function refreshMyStatus(){
    setIsLoading(true);
    try{setMyBooking(await api.fetchBookingByEmail(empEmail));await loadSlots();showNotification("最新の状態に更新しました");}
    catch(e){setError(e.message);}finally{setIsLoading(false);}
  }

  const availableSlots=slots.filter(s=>!s.booked);
  const grouped=groupByDate(availableSlots);

  // ── ホーム ──
  if(mode==="home")return(
    <div style={{minHeight:"100vh",background:"linear-gradient(135deg,#667eea,#764ba2)",display:"flex",alignItems:"center",justifyContent:"center"}}>
      {notification&&<Toast msg={notification}/>}
      <div style={{background:"#fff",borderRadius:16,padding:40,maxWidth:420,width:"90%",textAlign:"center",boxShadow:"0 20px 60px rgba(0,0,0,0.2)"}}>
        <div style={{fontSize:40,marginBottom:8}}>📅</div>
        <h1 style={{fontSize:24,color:"#333",marginBottom:8}}>面談スケジューラー</h1>
        <p style={{color:"#666",marginBottom:32,fontSize:14}}>面談希望日時をご入力ください</p>
        <button onClick={()=>setMode("employee")} style={btnStyle("#667eea")}>社員として参加する</button>
        <button onClick={()=>setMode("admin")} style={{...btnStyle("#764ba2"),marginTop:12}}>管理者（ホスト）ページ</button>
      </div>
    </div>
  );

  // ── 管理者ページ ──
  if(mode==="admin")return(
    <div style={{minHeight:"100vh",background:"#f5f6fa",padding:24}}>
      {notification&&<Toast msg={notification}/>}
      <div style={{maxWidth:860,margin:"0 auto"}}>
        <button onClick={()=>{setMode("home");setIsAdminLoggedIn(false);setAdminPass("");api.clearAdminToken();}} style={backBtn()}>← ホームへ</button>
        <h2 style={{color:"#333"}}>管理者ページ</h2>
        {error&&<ErrBox msg={error} onClose={()=>setError("")}/>}
        {!isAdminLoggedIn?(
          <div style={cardStyle()}>
            <h3>管理者ログイン</h3>
            <input type="password" placeholder="パスワード" value={adminPass} onChange={e=>setAdminPass(e.target.value)} onKeyDown={e=>e.key==="Enter"&&adminLogin()} style={inputStyle()}/>
            {adminError&&<p style={{color:"red",fontSize:13,marginTop:-8}}>{adminError}</p>}
            <button onClick={adminLogin} disabled={isLoading} style={btnStyle(isLoading?"#aaa":"#667eea")}>{isLoading?"ログイン中...":"ログイン"}</button>
          </div>
        ):(<>
          {/* ホスト設定 */}
          <div style={cardStyle()}>
            <h3>✉️ ホストのメールアドレス設定</h3>
            <p style={{fontSize:13,color:"#666",marginBottom:8}}>
              通知メールの送信先です。複数ある場合はカンマ（,）で区切ってください。<br/>
              <span style={{color:"#888"}}>例: host1@company.com, host2@company.com</span>
            </p>
            <textarea value={hostEmails} onChange={e=>setHostEmails(e.target.value)}
              placeholder="host@company.com, manager@company.com" rows={3}
              style={{display:"block",width:"100%",padding:"10px 12px",border:"1px solid #ddd",borderRadius:6,fontSize:14,marginBottom:12,boxSizing:"border-box",resize:"vertical"}}/>
            <button onClick={saveHostEmails} disabled={isLoading} style={btnStyle(isLoading?"#aaa":"#667eea")}>
              {hostEmailsSaved?"✅ 保存しました":isLoading?"保存中...":"メールアドレスを保存する"}
            </button>
          </div>

          {/* スロット追加 */}
          <div style={cardStyle()}>
            <h3>📌 面談枠を追加</h3>
            <div style={{display:"flex",gap:20,flexWrap:"wrap",alignItems:"flex-start"}}>
              <div>
                <label style={labelStyle()}>日付を選択</label>
                <MiniCalendar value={newSlotDate} onChange={setNewSlotDate}/>
                {newSlotDate&&(()=>{
                  const dow=new Date(newSlotDate).getDay(),isHol=isHoliday(newSlotDate),holName=getHolidayName(newSlotDate);
                  if(isHol)return<div style={{marginTop:6}}><span style={{color:"#e74c3c",fontSize:12}}>⚠️ 祝日（{holName}）</span></div>;
                  if(dow===0)return<div style={{marginTop:6}}><span style={{color:"#e74c3c",fontSize:12}}>⚠️ 日曜日</span></div>;
                  if(dow===6)return<div style={{marginTop:6}}><span style={{color:"#3498db",fontSize:12}}>⚠️ 土曜日</span></div>;
                  return<div style={{marginTop:6}}><span style={{color:"#27ae60",fontSize:12}}>✅ {formatDate(newSlotDate+"T00:00:00")}</span></div>;
                })()}
              </div>
              <div style={{flex:1,minWidth:200}}>
                <label style={labelStyle()}>面談時間</label>
                <div style={{display:"flex",gap:8,marginBottom:12}}>
                  {["60","90","120"].map(d=>(
                    <button key={d} onClick={()=>setNewSlotDuration(d)} style={{flex:1,padding:"10px 0",border:`2px solid ${newSlotDuration===d?"#667eea":"#ddd"}`,borderRadius:8,background:newSlotDuration===d?"#667eea":"#fff",color:newSlotDuration===d?"#fff":"#555",fontWeight:600,cursor:"pointer",fontSize:14}}>{d}分</button>
                  ))}
                </div>
                <label style={labelStyle()}>開始時刻</label>
                <input type="time" value={newSlotStart} onChange={e=>setNewSlotStart(e.target.value)} style={inputStyle()}/>
                <label style={labelStyle()}>終了時刻（自動）</label>
                <div style={{padding:"10px 12px",border:"1px solid #ddd",borderRadius:6,fontSize:14,background:"#f8f8f8",marginBottom:12,color:newSlotEnd?"#333":"#aaa"}}>
                  {newSlotEnd?`〜 ${newSlotEnd}（${newSlotDuration}分）`:"開始時刻を入力すると自動計算されます"}
                </div>
                <button onClick={addSlot} disabled={!newSlotDate||!newSlotStart||isLoading} style={btnStyle(!newSlotDate||!newSlotStart||isLoading?"#aaa":"#667eea")}>{isLoading?"追加中...":"この枠を追加する"}</button>
              </div>
            </div>
          </div>

          {/* 登録済みスロット */}
          <div style={cardStyle()}>
            <h3>📋 登録済み面談枠</h3>
            {slots.length===0?<p style={{color:"#999"}}>まだ枠が登録されていません</p>:(
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:14}}>
                <thead><tr style={{background:"#f0f0f0"}}><th style={th()}>日付</th><th style={th()}>開始</th><th style={th()}>終了</th><th style={th()}>状態</th><th style={th()}>操作</th></tr></thead>
                <tbody>
                  {slots.map(s=>{
                    const dateStr=s.start.slice(0,10),dow=new Date(s.start).getDay(),isHol=isHoliday(dateStr),holName=getHolidayName(dateStr);
                    return(
                      <tr key={s.id} style={{borderBottom:"1px solid #eee",background:(isHol||dow===0)?"#fff8f8":dow===6?"#f0f6ff":"transparent"}}>
                        <td style={td()}><span style={{color:(isHol||dow===0)?"#e74c3c":dow===6?"#3498db":"#333"}}>{formatDate(s.start)}{isHol&&<span style={{marginLeft:6,fontSize:11,background:"#e74c3c",color:"#fff",borderRadius:3,padding:"1px 5px"}}>{holName}</span>}</span></td>
                        <td style={td()}>{formatTime(s.start)}</td>
                        <td style={td()}>〜 {formatTime(s.end)}</td>
                        <td style={td()}><span style={{color:s.booked?"#e74c3c":"#27ae60",fontWeight:600}}>{s.booked?"予約済":"空き"}</span></td>
                        <td style={td()}><button onClick={()=>deleteSlot(s.id)} disabled={isLoading} style={{background:"#e74c3c",color:"#fff",border:"none",borderRadius:4,padding:"4px 10px",cursor:"pointer",fontSize:12}}>削除</button>{s.booked&&<span style={{marginLeft:6,fontSize:11,color:"#e74c3c"}}>※予約済</span>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* 社員の希望一覧 */}
          <div style={cardStyle()}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
              <h3 style={{margin:0}}>👥 社員の希望一覧</h3>
              <span style={{fontSize:12,color:"#aaa"}}>10秒ごとに自動更新</span>
            </div>
            <p style={{fontSize:12,color:"#999",marginBottom:16}}>社員が希望を提出・変更すると自動的に反映されます</p>
            {/* 元に戻すバナー */}
            {undoTarget&&(
              <div style={{background:"#333",color:"#fff",borderRadius:8,padding:"10px 16px",marginBottom:12,display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:13}}>
                <span>🗑 {undoTarget.name}さんのデータを削除しました</span>
                <button onClick={undoDelete} style={{background:"#f39c12",color:"#fff",border:"none",borderRadius:5,padding:"5px 14px",cursor:"pointer",fontWeight:700,fontSize:13}}>元に戻す</button>
              </div>
            )}
            {bookings.filter(b=>!b.cancelled).length===0?<p style={{color:"#999"}}>まだ希望がありません</p>:
              bookings.filter(b=>!b.cancelled).map(b=>{
                return(
                  <div key={b.id} style={{border:`2px solid ${b.confirmed?"#27ae60":"#ddd"}`,borderRadius:8,padding:16,marginBottom:12,background:b.confirmed?"#f9fff9":"#fff"}}>
                    <div style={{display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:8,marginBottom:10}}>
                      <div>
                        <strong style={{fontSize:15}}>{b.name}</strong>
                        <span style={{color:"#666",fontSize:13,marginLeft:8}}>{b.email}</span>
                        {b.changedAt&&<span style={{marginLeft:8,background:"#fff3cd",color:"#856404",fontSize:11,padding:"2px 6px",borderRadius:4}}>変更あり</span>}
                      </div>
                      <div style={{display:"flex",alignItems:"center",gap:8}}>
                        <span style={{color:b.confirmed?"#27ae60":"#e67e22",fontWeight:700,fontSize:13}}>{b.confirmed?"✅ 確定済":"⏳ 未確定"}</span>
                        <button onClick={()=>deleteBooking(b.id,b.name)} disabled={isLoading}
                          title="この予約を削除する"
                          style={{background:"#e74c3c",color:"#fff",border:"none",borderRadius:4,padding:"4px 10px",cursor:"pointer",fontSize:12,whiteSpace:"nowrap"}}>削除</button>
                      </div>
                    </div>
                    {/* 確定日時を強調表示 */}
                    {b.confirmed&&(()=>{
                      const cs=slots.find(s=>s.id===b.confirmedSlotId);
                      return cs?(
                        <div style={{background:"#e8f8ee",border:"2px solid #27ae60",borderRadius:8,padding:"10px 14px",marginBottom:10}}>
                          <span style={{fontSize:12,color:"#27ae60",fontWeight:700}}>🗓 確定日時</span>
                          <p style={{margin:"4px 0 0",fontSize:15,fontWeight:700,color:"#1a7a3e"}}>{formatDateTime(cs.start)} 〜 {formatTime(cs.end)}</p>
                        </div>
                      ):null;
                    })()}
                    {/* 全希望を常に表示（確定後は薄く表示） */}
                    <div>
                      {b.preferences.map((pid,i)=>{
                        const sl=slots.find(s=>s.id===pid);
                        if(!sl)return null;
                        const isConfirmed=b.confirmedSlotId===pid;
                        const colors=["#e74c3c","#e67e22","#3498db"];
                        return(
                          <div key={pid} style={{display:"flex",alignItems:"center",gap:8,marginBottom:6,flexWrap:"wrap",opacity:b.confirmed&&!isConfirmed?0.45:1}}>
                            <span style={{background:isConfirmed?"#27ae60":colors[i],color:"#fff",borderRadius:4,padding:"2px 8px",fontSize:12,whiteSpace:"nowrap"}}>
                              第{i+1}希望{isConfirmed?" ✅":""}
                            </span>
                            <span style={{fontSize:13,color:b.confirmed&&!isConfirmed?"#aaa":"#333"}}>{formatDateTime(sl.start)} 〜 {formatTime(sl.end)}</span>
                            {!b.confirmed&&(
                              <button onClick={()=>confirmBooking(b.id,pid)} disabled={isLoading||sl.booked}
                                style={{background:sl.booked?"#bbb":"#27ae60",color:"#fff",border:"none",borderRadius:4,padding:"4px 10px",cursor:sl.booked?"not-allowed":"pointer",fontSize:12}}>
                                {sl.booked?"予約済":"この日時で確定"}
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            }
          </div>
        </>)}
      </div>
    </div>
  );

  // ── 社員ページ ──
  if(mode==="employee")return(
    <div style={{minHeight:"100vh",background:"#f5f6fa",padding:24}}>
      {notification&&<Toast msg={notification}/>}
      <div style={{maxWidth:600,margin:"0 auto"}}>
        <button onClick={()=>{setMode("home");setEmpStep("form");setSelected([]);setEmpName("");setEmpEmail("");setMyBooking(null);setError("");}} style={backBtn()}>← ホームへ</button>
        <h2 style={{color:"#333"}}>面談希望日時の入力</h2>
        {error&&<ErrBox msg={error} onClose={()=>setError("")}/>}

        {empStep==="form"&&(
          <div style={cardStyle()}>
            <h3>お名前とメールアドレスを入力してください</h3>
            <label style={labelStyle()}>お名前</label>
            <input value={empName} onChange={e=>setEmpName(e.target.value)} placeholder="山田 太郎" style={inputStyle()}/>
            <label style={labelStyle()}>メールアドレス</label>
            <input value={empEmail} onChange={e=>setEmpEmail(e.target.value)} placeholder="taro@company.com" style={inputStyle()} type="email"/>
            <button onClick={submitEmpForm} disabled={!empName||!empEmail||isLoading} style={btnStyle(!empName||!empEmail||isLoading?"#aaa":"#667eea")}>{isLoading?"確認中...":"次へ"}</button>
          </div>
        )}

        {empStep==="myStatus"&&myBooking&&(()=>{
          const confirmedSlot=slots.find(s=>s.id===myBooking.confirmedSlotId);
          return(
            <div style={cardStyle()}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
                <h3 style={{margin:0}}>現在の状況</h3>
                <button onClick={refreshMyStatus} disabled={isLoading} style={{background:"#667eea",color:"#fff",border:"none",borderRadius:6,padding:"6px 14px",cursor:"pointer",fontSize:13}}>{isLoading?"更新中...":"🔄 更新"}</button>
              </div>
              {myBooking.confirmed?(
                <>
                  <p style={{color:"#27ae60",fontWeight:600}}>✅ 面談日時が確定しています</p>
                  {confirmedSlot?<p style={{fontSize:15,marginTop:8,background:"#f0fff4",padding:12,borderRadius:8,border:"1px solid #d4edda"}}><strong>{formatDateTime(confirmedSlot.start)} 〜 {formatTime(confirmedSlot.end)}</strong></p>:<p style={{color:"#999",fontSize:13}}>（確定枠の情報が見つかりません）</p>}
                  <button onClick={()=>{setChangeSelected([]);setEmpStep("change");}} style={{...btnStyle("#e67e22"),marginTop:16}}>日時を変更したい</button>
                </>
              ):(
                <>
                  <p style={{color:"#e67e22",fontWeight:600}}>⏳ 希望を提出済み（確定待ち）</p>
                  {myBooking.preferences.map((pid,i)=>{const sl=slots.find(s=>s.id===pid);return sl?<p key={pid} style={{fontSize:14,background:"#fff8f0",padding:"8px 12px",borderRadius:6,margin:"4px 0"}}>第{i+1}希望: {formatDateTime(sl.start)} 〜 {formatTime(sl.end)}</p>:null;})}
                  <button onClick={()=>{setChangeSelected([]);setEmpStep("change");}} style={{...btnStyle("#e67e22"),marginTop:16}}>希望を変更したい</button>
                </>
              )}
              <p style={{color:"#aaa",fontSize:12,marginTop:16}}>※ 30秒ごとに自動更新されます</p>
            </div>
          );
        })()}

        {(empStep==="pick"||empStep==="change")&&(
          <div style={cardStyle()}>
            <h3>{empStep==="change"?"新しい希望日時を選択してください":"希望日時を選択してください"}（最大3つ）</h3>
            <p style={{fontSize:13,color:"#666",marginBottom:12}}>クリックした順に第1・第2・第3希望となります</p>
            {/* ボタンを上部に配置 */}
            <div style={{marginBottom:16}}>
              {empStep==="pick"
                ?<button onClick={submitPreferences} disabled={selected.length===0||isLoading} style={btnStyle(selected.length===0||isLoading?"#aaa":"#667eea")}>{isLoading?"送信中...":"希望を提出する"} ({selected.length}/3)</button>
                :<button onClick={submitChange} disabled={changeSelected.length===0||isLoading} style={btnStyle(changeSelected.length===0||isLoading?"#aaa":"#e67e22")}>{isLoading?"送信中...":"変更を提出する"} ({changeSelected.length}/3)</button>
              }
            </div>
            {availableSlots.length===0?<p style={{color:"#999"}}>現在選択できる枠がありません。管理者にお問い合わせください。</p>:
              Object.entries(grouped).sort().map(([day,daySlots])=>(
                <div key={day} style={{marginBottom:16}}>
                  <div style={{fontWeight:600,color:"#555",marginBottom:8,fontSize:14}}>{formatDate(daySlots[0].start)}{isHoliday(day)&&<span style={{marginLeft:8,fontSize:11,background:"#e74c3c",color:"#fff",borderRadius:3,padding:"1px 5px"}}>{getHolidayName(day)}</span>}</div>
                  {daySlots.map(s=>{
                    const sel=empStep==="pick"?selected:changeSelected,toggle=empStep==="pick"?toggleSelect:toggleChangeSelect;
                    const idx=sel.indexOf(s.id),isSelected=idx!==-1;
                    return(
                      <div key={s.id} onClick={()=>toggle(s.id)}
                        style={{border:`2px solid ${isSelected?["#e74c3c","#e67e22","#3498db"][idx]:"#ddd"}`,borderRadius:8,padding:"12px 16px",marginBottom:8,cursor:"pointer",
                          background:isSelected?["#ffeaea","#fff3e0","#e8f4ff"][idx]:"#fff",display:"flex",justifyContent:"space-between",alignItems:"center",transition:"all 0.2s"}}>
                        <span style={{fontSize:14}}>{formatTime(s.start)} 〜 {formatTime(s.end)}</span>
                        {isSelected&&<span style={{background:["#e74c3c","#e67e22","#3498db"][idx],color:"#fff",borderRadius:4,padding:"2px 8px",fontSize:12}}>第{idx+1}希望</span>}
                      </div>
                    );
                  })}
                </div>
              ))
            }
          </div>
        )}

        {empStep==="done"&&(
          <div style={cardStyle()}>
            <div style={{textAlign:"center",padding:24}}>
              <div style={{fontSize:48}}>🎉</div>
              <h3 style={{color:"#27ae60"}}>提出完了！</h3>
              <p style={{color:"#666"}}>希望日時を受け付けました。<br/>面談日時が確定しましたら、メールでお知らせします。</p>
              <button onClick={async()=>{
                setIsLoading(true);
                try{setMyBooking(await api.fetchBookingByEmail(empEmail));await loadSlots();setEmpStep("myStatus");}
                catch(e){setError(e.message);}finally{setIsLoading(false);}
              }} style={btnStyle("#667eea")}>状況を確認する</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Toast({msg}){return<div style={{position:"fixed",top:20,right:20,background:"#27ae60",color:"#fff",padding:"12px 20px",borderRadius:8,zIndex:9999,maxWidth:320,fontSize:14,boxShadow:"0 4px 12px rgba(0,0,0,0.2)"}}>{msg}</div>;}
function ErrBox({msg,onClose}){return<div style={{background:"#ffeaea",border:"1px solid #f5c6cb",color:"#721c24",padding:"10px 16px",borderRadius:8,marginBottom:16,fontSize:14,display:"flex",justifyContent:"space-between",alignItems:"center"}}><span>{msg}</span><button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:"#721c24",fontSize:16}}>✕</button></div>;}
function btnStyle(color){return{background:color,color:"#fff",border:"none",borderRadius:8,padding:"12px 24px",cursor:"pointer",fontSize:15,fontWeight:600,width:"100%",display:"block"};}
function backBtn(){return{background:"none",border:"none",color:"#667eea",cursor:"pointer",fontSize:14,padding:"0 0 16px 0",fontWeight:600};}
function cardStyle(){return{background:"#fff",borderRadius:12,padding:24,marginBottom:20,boxShadow:"0 2px 12px rgba(0,0,0,0.08)"};}
function inputStyle(){return{display:"block",width:"100%",padding:"10px 12px",border:"1px solid #ddd",borderRadius:6,fontSize:14,marginBottom:12,boxSizing:"border-box"};}
function labelStyle(){return{display:"block",fontSize:13,color:"#555",marginBottom:4,fontWeight:600};}
function th(){return{padding:"8px 12px",textAlign:"left",fontSize:13};}
function td(){return{padding:"8px 12px",fontSize:13};}
