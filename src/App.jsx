import React, { useState, useEffect } from 'react';

const INITIAL_DATA = {
  lists: ['Work', 'Personal', 'Errands'],
  tasks: [
    { id: 1, title: 'Review quarterly metrics', list: 'Work', dueDate: 'Thursday', reminder: true, completed: false },
    { id: 2, title: 'Renew library books', list: 'Work', dueDate: 'Monday', reminder: true, completed: false },
    { id: 3, title: 'Buy groceries', list: 'Errands', dueDate: 'Saturday', reminder: false, completed: true },
  ]
};

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function App() {
  // App Navigation: 'screening' | 'tasks' | 'completion' | 'researcher'
  const [screen, setScreen] = useState('screening');

  // Participant Screening State (Section 4 & 7 of Experimental Plan)
  const [participantId, setParticipantId] = useState('');
  const [participantAge, setParticipantAge] = useState('');
  const [diagnosisGroup, setDiagnosisGroup] = useState('ADHD'); // 'ADHD' | 'Autism' | 'Both' | 'Control'
  const [consentGiven, setConsentGiven] = useState(false);

  // Variant Mapping based on Group (or manual override)
  // ADHD -> Variant B, Autism -> Variant C, Control/Neither -> Variant A
  const [variant, setVariant] = useState('B'); 
  const [activeTaskPrompt, setActiveTaskPrompt] = useState('T1');

  // App Data State
  const [lists, setLists] = useState(INITIAL_DATA.lists);
  const [tasks, setTasks] = useState(INITIAL_DATA.tasks);
  const [selectedList, setSelectedList] = useState('Work');

  // Silent Background Telemetry State (Section 6 Metrics)
  const [startTime, setStartTime] = useState(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [clicks, setClicks] = useState(0);
  const [errors, setErrors] = useState(0);
  const [backtracks, setBacktracks] = useState(0);
  const [assists, setAssists] = useState(0);

  // Form & Interaction States
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDate, setNewTaskDate] = useState('Friday');
  const [newTaskReminder, setNewTaskReminder] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [editingTask, setEditingTask] = useState(null);

  // Variant A Distraction State
  const [showPromoBanner, setShowPromoBanner] = useState(true);
  const [toastPopup, setToastPopup] = useState('🔔 Tip: Upgrade to TaskMaster Pro for cloud sync!');

  // Variant B (ADHD) Wizard State
  const [adhdMode, setAdhdMode] = useState('view'); // 'view' | 'addTask' | 'addList' | 'editTask'
  const [adhdStep, setAdhdStep] = useState(1);

  // Variant C (ASD) Confirmation Modal State
  const [asdConfirm, setAsdConfirm] = useState(null);

  // Live Timer Effect (Runs silently in background during tasks)
  useEffect(() => {
    if (!timerRunning) return;
    const interval = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, [timerRunning]);

  // Handle Screening Submission & Start Session
  const handleStartSession = (e) => {
    e.preventDefault();
    if (!participantId.trim() || !participantAge || !consentGiven) {
      alert('Please fill in Participant ID, Age, and confirm Informed Consent.');
      return;
    }

    // Automatically map variant based on group selection
    if (diagnosisGroup === 'ADHD') setVariant('B');
    else if (diagnosisGroup === 'Autism') setVariant('C');
    else setVariant('A'); // Control / Neither

    setStartTime(new Date().toISOString());
    setElapsedSeconds(0);
    setClicks(0);
    setErrors(0);
    setBacktracks(0);
    setAssists(0);
    setTimerRunning(true);
    setScreen('tasks');
  };

  // Save Session Logs to localStorage when session completes
  const saveAndCompleteSession = () => {
    setTimerRunning(false);
    const sessionRecord = {
      participantId,
      participantAge,
      diagnosisGroup,
      variantTested: variant,
      timestamp: startTime,
      durationSeconds: elapsedSeconds,
      metrics: {
        totalClicks: clicks,
        errorsOrDistractions: errors,
        backtracks: backtracks,
        assistsNeeded: assists
      }
    };

    // Save into array of logs in localStorage
    const existingLogs = JSON.parse(localStorage.getItem('tm_study_logs') || '[]');
    localStorage.setItem('tm_study_logs', JSON.stringify([...existingLogs, sessionRecord]));
    setScreen('completion');
  };

  // Telemetry helpers
  const recordClick = () => setClicks((c) => c + 1);
  const recordDistractionError = (msg) => {
    setClicks((c) => c + 1);
    setErrors((e) => e + 1);
    if (variant === 'A') {
      setToastPopup(`⚠️ Distraction clicked: ${msg}`);
    }
  };

  // CRUD Operations
  const addList = (e) => {
    if (e) e.preventDefault();
    recordClick();
    if (!newListName.trim()) { setErrors(e => e + 1); return; }
    const clean = newListName.trim();
    if (!lists.includes(clean)) setLists([...lists, clean]);
    setSelectedList(clean);
    setNewListName('');
    setAdhdMode('view');
    setAdhdStep(1);
  };

  const addTask = (e) => {
    if (e) e.preventDefault();
    recordClick();
    if (!newTaskTitle.trim()) { setErrors(e => e + 1); return; }
    const created = {
      id: Date.now(),
      title: newTaskTitle.trim(),
      list: selectedList,
      dueDate: newTaskDate,
      reminder: newTaskReminder,
      completed: false,
    };
    setTasks([...tasks, created]);
    setNewTaskTitle('');
    setNewTaskDate('Friday');
    setNewTaskReminder(false);
    setAdhdMode('view');
    setAdhdStep(1);
  };

  const toggleComplete = (task) => {
    recordClick();
    const execute = () => {
      setTasks(tasks.map(t => t.id === task.id ? { ...t, completed: !t.completed } : t));
      setAsdConfirm(null);
    };
    if (variant === 'C') {
      setAsdConfirm({
        title: 'Confirm Status Change',
        message: `Are you sure you want to mark "${task.title}" as ${task.completed ? 'Incomplete' : 'Completed'}?`,
        onConfirm: execute,
      });
    } else {
      execute();
    }
  };

  const toggleReminderQuick = (task) => {
    recordClick();
    const execute = () => {
      setTasks(tasks.map(t => t.id === task.id ? { ...t, reminder: !t.reminder } : t));
      setAsdConfirm(null);
    };
    if (variant === 'C') {
      setAsdConfirm({
        title: 'Confirm Reminder Setting',
        message: `Do you want to toggle the reminder for "${task.title}"?`,
        onConfirm: execute,
      });
    } else {
      execute();
    }
  };

  const saveEditedTask = () => {
    recordClick();
    if (!editingTask) return;
    const execute = () => {
      setTasks(tasks.map(t => t.id === editingTask.id ? editingTask : t));
      setSelectedList(editingTask.list);
      setEditingTask(null);
      setAdhdMode('view');
      setAdhdStep(1);
      setAsdConfirm(null);
    };
    if (variant === 'C') {
      setAsdConfirm({
        title: 'Confirm Task Changes',
        message: `Save changes to "${editingTask.title}"?`,
        onConfirm: execute,
      });
    } else {
      execute();
    }
  };

  const currentListTasks = tasks.filter(t => t.list === selectedList);

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', minHeight: '100vh', backgroundColor: variant === 'C' ? '#F4F6F4' : '#F8FAFC', color: '#1E293B' }}>
      
      {/* ================= SCREEN 1: PARTICIPANT SCREENING & CONSENT ================= */}
      {screen === 'screening' && (
        <div style={{ maxWidth: '600px', margin: '60px auto', backgroundColor: '#FFF', padding: '32px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', border: '1px solid #E2E8F0' }}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <h1 style={{ margin: '0 0 8px', color: '#0F172A', fontSize: '24px' }}>TaskMaster Study Session</h1>
            <p style={{ margin: 0, color: '#64748B', fontSize: '14px' }}>Please fill in your participant details before starting the tasks.</p>
          </div>

          <form onSubmit={handleStartSession} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontWeight: 600, fontSize: '13px', marginBottom: '6px' }}>Participant ID / Code:</label>
              <input
                type="text"
                required
                placeholder="e.g., P-01"
                value={participantId}
                onChange={(e) => setParticipantId(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #CBD5E1', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: 600, fontSize: '13px', marginBottom: '6px' }}>Age (12+):</label>
              <input
                type="number"
                required
                min="12"
                placeholder="e.g., 20"
                value={participantAge}
                onChange={(e) => setParticipantAge(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #CBD5E1', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: 600, fontSize: '13px', marginBottom: '6px' }}>Study Group / Diagnosis Category:</label>
              <select
                value={diagnosisGroup}
                onChange={(e) => setDiagnosisGroup(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #CBD5E1', backgroundColor: '#FFF' }}
              >
                <option value="ADHD">ADHD Group (Assigned to Variant B)</option>
                <option value="Autism">Autism / ASD Group (Assigned to Variant C)</option>
                <option value="Control">Control / Standard Group (Assigned to Variant A)</option>
              </select>
            </div>

            <div style={{ backgroundColor: '#F1F5F9', padding: '12px', borderRadius: '6px', fontSize: '13px', color: '#475569', lineHeight: 1.4 }}>
              <b>Informed Consent:</b> Sessions involve completing 3 tasks on a to-do list interface. Data is recorded anonymously for research purposes. You may pause or stop at any time[cite: 6].
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                required
                checked={consentGiven}
                onChange={(e) => setConsentGiven(e.target.checked)}
                style={{ width: '18px', height: '18px' }}
              />
              <span>I give informed consent to participate in this study[cite: 6].</span>
            </label>

            <button type="submit" style={{ marginTop: '10px', padding: '12px', backgroundColor: '#2563EB', color: '#FFF', border: 'none', borderRadius: '6px', fontWeight: 700, fontSize: '16px', cursor: 'pointer' }}>
              Begin Tasks →
            </button>
          </form>

          {/* Discreet Researcher Link at Bottom */}
          <div style={{ marginTop: '30px', textAlign: 'center', borderTop: '1px solid #F1F5F9', paddingTop: '16px' }}>
            <button onClick={() => setScreen('researcher')} style={{ background: 'none', border: 'none', color: '#94A3B8', fontSize: '12px', cursor: 'pointer', textDecoration: 'underline' }}>
              🔒 Researcher Portal (View Logs & Export Data)
            </button>
          </div>
        </div>
      )}

      {/* ================= SCREEN 2: THE TASK INTERFACE (NO VISIBLE TELEMETRY BAR FOR PARTICIPANTS) ================= */}
      {screen === 'tasks' && (
        <div style={{ paddingBottom: '40px' }}>
          
          {/* Subtle Participant Task Prompt Banner */}
          <div style={{ backgroundColor: '#1E293B', color: '#FFF', padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '14px' }}>
            <span>📋 <b>Active Task Instruction:</b> Complete Tasks T1, T2, and T3 using this interface variant.</span>
            <button
              onClick={saveAndCompleteSession}
              style={{ padding: '6px 14px', backgroundColor: '#16A34A', color: '#FFF', border: 'none', borderRadius: '6px', fontWeight: 700, cursor: 'pointer', fontSize: '13px' }}
            >
              Finish Study Session ✓
            </button>
          </div>

          {/* ================= VARIANT A: STANDARD (CONTROL) ================= */}
          {variant === 'A' && (
            <div style={{ maxWidth: '1200px', margin: '20px auto', padding: '0 16px' }}>
              <header style={{ backgroundColor: '#4F46E5', color: '#FFF', padding: '12px 20px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h1 style={{ margin: 0, fontSize: '20px' }}>⚡ TaskMaster Pro v4.2</h1>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => recordDistractionError('Bell Icon')} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#FFF', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer' }}>🔔 4</button>
                  <button onClick={() => recordDistractionError('Settings Icon')} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#FFF', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer' }}>⚙️</button>
                </div>
              </header>

              {showPromoBanner && (
                <div style={{ background: 'linear-gradient(90deg, #EC4899, #8B5CF6)', color: '#FFF', padding: '10px 16px', borderRadius: '8px', marginBottom: '14px', display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                  <span>🎉 <b>FLASH SALE:</b> 50% off TaskMaster AI Assistant!</span>
                  <button onClick={() => { recordClick(); setShowPromoBanner(false); }} style={{ background: 'transparent', color: '#FFF', border: '1px solid #FFF', padding: '2px 6px', borderRadius: '4px', cursor: 'pointer' }}>✕</button>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr 220px', gap: '16px' }}>
                <aside style={{ backgroundColor: '#FFF', padding: '14px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748B', marginBottom: '10px' }}>LISTS</div>
                  {lists.map(l => (
                    <div key={l} onClick={() => { recordClick(); setSelectedList(l); }} style={{ padding: '8px', borderRadius: '6px', cursor: 'pointer', backgroundColor: selectedList === l ? '#EEF2FF' : 'transparent', color: selectedList === l ? '#4F46E5' : '#334155', fontWeight: selectedList === l ? 700 : 500 }}>
                      📁 {l}
                    </div>
                  ))}
                </aside>

                <main style={{ backgroundColor: '#FFF', padding: '16px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                  <h2 style={{ margin: '0 0 12px', fontSize: '18px' }}>{selectedList} Tasks</h2>
                  <form onSubmit={addTask} style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                    <input type="text" placeholder="Quick add task..." value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)} style={{ flex: 1, padding: '8px', border: '1px solid #CBD5E1', borderRadius: '4px' }} />
                    <select value={newTaskDate} onChange={e => setNewTaskDate(e.target.value)} style={{ padding: '8px', border: '1px solid #CBD5E1', borderRadius: '4px' }}>
                      {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                    <button type="submit" style={{ padding: '8px 14px', backgroundColor: '#4F46E5', color: '#FFF', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>➕</button>
                  </form>

                  {currentListTasks.map(task => (
                    <div key={task.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', borderBottom: '1px solid #F1F5F9' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <button onClick={() => toggleComplete(task)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '16px' }}>{task.completed ? '✅' : '⬜'}</button>
                        <div>
                          <div style={{ fontWeight: 600, textDecoration: task.completed ? 'line-through' : 'none' }}>{task.title}</div>
                          <div style={{ fontSize: '12px', color: '#64748B' }}>📅 {task.dueDate} • 📁 {task.list}</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button onClick={() => toggleReminderQuick(task)} style={{ padding: '6px', border: '1px solid #E2E8F0', borderRadius: '4px', background: task.reminder ? '#FEF3C7' : '#FFF', cursor: 'pointer' }}>🔔</button>
                        <button onClick={() => { recordClick(); setEditingTask({ ...task }); }} style={{ padding: '6px', border: '1px solid #E2E8F0', borderRadius: '4px', background: '#FFF', cursor: 'pointer' }}>⚙️</button>
                      </div>
                    </div>
                  ))}

                  {editingTask && (
                    <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#EEF2FF', borderRadius: '8px' }}>
                      <div style={{ fontWeight: 700, marginBottom: '8px' }}>Modify: {editingTask.title}</div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <select value={editingTask.list} onChange={e => setEditingTask({ ...editingTask, list: e.target.value })} style={{ padding: '6px' }}>
                          {lists.map(l => <option key={l} value={l}>{l}</option>)}
                        </select>
                        <select value={editingTask.dueDate} onChange={e => setEditingTask({ ...editingTask, dueDate: e.target.value })} style={{ padding: '6px' }}>
                          {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                        <button onClick={saveEditedTask} style={{ padding: '6px 12px', backgroundColor: '#4F46E5', color: '#FFF', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Save</button>
                        <button onClick={() => { setBacktracks(b => b + 1); setEditingTask(null); }} style={{ padding: '6px', backgroundColor: '#E2E8F0', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>
                      </div>
                    </div>
                  )}
                </main>

                <aside style={{ backgroundColor: '#FFF', padding: '12px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontWeight: 700, fontSize: '13px', marginBottom: '6px' }}>🔥 Leaderboard</div>
                  <button onClick={() => recordDistractionError('Leaderboard')} style={{ width: '100%', padding: '6px', fontSize: '12px', cursor: 'pointer' }}>View Global Rankings</button>
                </aside>
              </div>
            </div>
          )}

          {/* ================= VARIANT B: ADHD-ADAPTED ================= */}
          {variant === 'B' && (
            <div style={{ maxWidth: '680px', margin: '32px auto', padding: '0 16px' }}>
              <div style={{ backgroundColor: '#FFF', padding: '16px 24px', borderRadius: '12px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                <div>
                  <h1 style={{ margin: 0, fontSize: '20px', color: '#0F172A' }}>TaskMaster Focus</h1>
                  <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748B' }}>ADHD-Adapted Mode • Single-focus steps</p>
                </div>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#2563EB', backgroundColor: '#EFF6FF', padding: '6px 12px', borderRadius: '20px' }}>
                  ✓ {currentListTasks.filter(t => t.completed).length} of {currentListTasks.length} Done
                </span>
              </div>

              {adhdMode === 'view' && (
                <div style={{ backgroundColor: '#FFF', padding: '24px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid #F1F5F9' }}>
                    {lists.map(l => (
                      <button key={l} onClick={() => { recordClick(); setSelectedList(l); }} style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 600, backgroundColor: selectedList === l ? '#2563EB' : '#F1F5F9', color: selectedList === l ? '#FFF' : '#475569' }}>
                        {l}
                      </button>
                    ))}
                    <button onClick={() => { recordClick(); setAdhdMode('addList'); setAdhdStep(1); }} style={{ padding: '8px 14px', borderRadius: '8px', border: '1px dashed #94A3B8', backgroundColor: '#FFF', cursor: 'pointer' }}>+ New List</button>
                  </div>

                  <button onClick={() => { recordClick(); setAdhdMode('addTask'); setAdhdStep(1); }} style={{ width: '100%', padding: '14px', backgroundColor: '#2563EB', color: '#FFF', border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: 700, cursor: 'pointer', marginBottom: '20px' }}>
                    + Add a New Task to "{selectedList}"
                  </button>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {currentListTasks.map(task => (
                      <div key={task.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', borderRadius: '10px', border: '1px solid #E2E8F0', backgroundColor: task.completed ? '#F8FAFC' : '#FFF' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <input type="checkbox" checked={task.completed} onChange={() => toggleComplete(task)} style={{ width: '20px', height: '20px', cursor: 'pointer' }} />
                          <div>
                            <div style={{ fontSize: '15px', fontWeight: 600, textDecoration: task.completed ? 'line-through' : 'none' }}>{task.title}</div>
                            <div style={{ fontSize: '13px', color: '#64748B' }}>Due: <b>{task.dueDate}</b> • Reminder: <b>{task.reminder ? 'ON' : 'OFF'}</b></div>
                          </div>
                        </div>
                        <button onClick={() => { recordClick(); setEditingTask({ ...task }); setAdhdMode('editTask'); setAdhdStep(1); }} style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #CBD5E1', backgroundColor: '#FFF', cursor: 'pointer', fontWeight: 600 }}>
                          Edit Task
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ADHD Wizard: Add List */}
              {adhdMode === 'addList' && (
                <div style={{ backgroundColor: '#FFF', padding: '28px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#2563EB', marginBottom: '8px' }}>STEP 1 OF 1</div>
                  <h2 style={{ margin: '0 0 16px', fontSize: '18px' }}>What would you like to name your new list?</h2>
                  <input type="text" autoFocus placeholder="e.g., Trip" value={newListName} onChange={e => setNewListName(e.target.value)} style={{ width: '100%', padding: '12px', fontSize: '15px', borderRadius: '8px', border: '2px solid #2563EB', marginBottom: '20px', boxSizing: 'border-box' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <button onClick={() => { setBacktracks(b => b + 1); setAdhdMode('view'); }} style={{ padding: '10px 18px', borderRadius: '8px', border: '1px solid #CBD5E1', background: '#FFF', cursor: 'pointer' }}>Cancel</button>
                    <button onClick={addList} style={{ padding: '10px 24px', borderRadius: '8px', border: 'none', backgroundColor: '#2563EB', color: '#FFF', fontWeight: 700, cursor: 'pointer' }}>Create List →</button>
                  </div>
                </div>
              )}

              {/* ADHD Wizard: Add Task Steps */}
              {adhdMode === 'addTask' && (
                <div style={{ backgroundColor: '#FFF', padding: '28px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 700, color: '#2563EB', marginBottom: '8px' }}>
                    <span>Step {adhdStep} of 3</span>
                    <span>{Math.round((adhdStep / 3) * 100)}%</span>
                  </div>
                  <div style={{ width: '100%', height: '8px', backgroundColor: '#E2E8F0', borderRadius: '4px', marginBottom: '24px', overflow: 'hidden' }}>
                    <div style={{ width: `${(adhdStep / 3) * 100}%`, height: '100%', backgroundColor: '#2563EB' }} />
                  </div>

                  {adhdStep === 1 && (
                    <div>
                      <h2 style={{ margin: '0 0 12px', fontSize: '18px' }}>1. What is the task name?</h2>
                      <input type="text" autoFocus placeholder="e.g., Submit report" value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)} style={{ width: '100%', padding: '12px', fontSize: '15px', borderRadius: '8px', border: '2px solid #2563EB', marginBottom: '20px', boxSizing: 'border-box' }} />
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <button onClick={() => { setBacktracks(b => b + 1); setAdhdMode('view'); }} style={{ padding: '10px 18px', borderRadius: '8px', border: '1px solid #CBD5E1', background: '#FFF', cursor: 'pointer' }}>Cancel</button>
                        <button onClick={() => { recordClick(); if (newTaskTitle.trim()) setAdhdStep(2); else setErrors(e => e + 1); }} style={{ padding: '10px 24px', borderRadius: '8px', border: 'none', backgroundColor: '#2563EB', color: '#FFF', fontWeight: 700, cursor: 'pointer' }}>Next →</button>
                      </div>
                    </div>
                  )}

                  {adhdStep === 2 && (
                    <div>
                      <h2 style={{ margin: '0 0 12px', fontSize: '18px' }}>2. When is it due?</h2>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: '20px' }}>
                        {DAYS.map(d => (
                          <button key={d} onClick={() => { recordClick(); setNewTaskDate(d); }} style={{ padding: '12px', borderRadius: '8px', border: newTaskDate === d ? '2px solid #2563EB' : '1px solid #CBD5E1', background: newTaskDate === d ? '#EFF6FF' : '#FFF', fontWeight: 600, cursor: 'pointer' }}>{d}</button>
                        ))}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <button onClick={() => { setBacktracks(b => b + 1); setAdhdStep(1); }} style={{ padding: '10px 18px', borderRadius: '8px', border: '1px solid #CBD5E1', background: '#FFF', cursor: 'pointer' }}>← Back</button>
                        <button onClick={() => { recordClick(); setAdhdStep(3); }} style={{ padding: '10px 24px', borderRadius: '8px', border: 'none', backgroundColor: '#2563EB', color: '#FFF', fontWeight: 700, cursor: 'pointer' }}>Next →</button>
                      </div>
                    </div>
                  )}

                  {adhdStep === 3 && (
                    <div>
                      <h2 style={{ margin: '0 0 12px', fontSize: '18px' }}>3. Would you like a reminder?</h2>
                      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
                        <button onClick={() => { recordClick(); setNewTaskReminder(true); }} style={{ flex: 1, padding: '16px', borderRadius: '8px', border: newTaskReminder ? '2px solid #2563EB' : '1px solid #CBD5E1', background: newTaskReminder ? '#EFF6FF' : '#FFF', fontWeight: 700, cursor: 'pointer' }}>🔔 Yes</button>
                        <button onClick={() => { recordClick(); setNewTaskReminder(false); }} style={{ flex: 1, padding: '16px', borderRadius: '8px', border: !newTaskReminder ? '2px solid #2563EB' : '1px solid #CBD5E1', background: !newTaskReminder ? '#EFF6FF' : '#FFF', fontWeight: 700, cursor: 'pointer' }}>🔕 No</button>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <button onClick={() => { setBacktracks(b => b + 1); setAdhdStep(2); }} style={{ padding: '10px 18px', borderRadius: '8px', border: '1px solid #CBD5E1', background: '#FFF', cursor: 'pointer' }}>← Back</button>
                        <button onClick={addTask} style={{ padding: '12px 28px', borderRadius: '8px', border: 'none', backgroundColor: '#16A34A', color: '#FFF', fontWeight: 700, cursor: 'pointer' }}>✓ Save Task</button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ADHD Wizard: Edit Task Steps */}
              {adhdMode === 'editTask' && editingTask && (
                <div style={{ backgroundColor: '#FFF', padding: '28px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 700, color: '#2563EB', marginBottom: '8px' }}>
                    <span>Editing "{editingTask.title}" • Step {adhdStep} of 3</span>
                  </div>
                  <div style={{ width: '100%', height: '8px', backgroundColor: '#E2E8F0', borderRadius: '4px', marginBottom: '24px', overflow: 'hidden' }}>
                    <div style={{ width: `${(adhdStep / 3) * 100}%`, height: '100%', backgroundColor: '#2563EB' }} />
                  </div>

                  {adhdStep === 1 && (
                    <div>
                      <h2 style={{ margin: '0 0 12px', fontSize: '18px' }}>Step 1: Select List</h2>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
                        {lists.map(l => (
                          <button key={l} onClick={() => { recordClick(); setEditingTask({ ...editingTask, list: l }); }} style={{ padding: '12px', textAlign: 'left', borderRadius: '8px', border: editingTask.list === l ? '2px solid #2563EB' : '1px solid #CBD5E1', background: editingTask.list === l ? '#EFF6FF' : '#FFF', fontWeight: 600, cursor: 'pointer' }}>📁 {l}</button>
                        ))}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <button onClick={() => { setBacktracks(b => b + 1); setAdhdMode('view'); setEditingTask(null); }} style={{ padding: '10px 18px', borderRadius: '8px', border: '1px solid #CBD5E1', background: '#FFF', cursor: 'pointer' }}>Cancel</button>
                        <button onClick={() => { recordClick(); setAdhdStep(2); }} style={{ padding: '10px 24px', borderRadius: '8px', border: 'none', backgroundColor: '#2563EB', color: '#FFF', fontWeight: 700, cursor: 'pointer' }}>Next →</button>
                      </div>
                    </div>
                  )}

                  {adhdStep === 2 && (
                    <div>
                      <h2 style={{ margin: '0 0 12px', fontSize: '18px' }}>Step 2: Choose Due Date</h2>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: '20px' }}>
                        {DAYS.map(d => (
                          <button key={d} onClick={() => { recordClick(); setEditingTask({ ...editingTask, dueDate: d }); }} style={{ padding: '12px', borderRadius: '8px', border: editingTask.dueDate === d ? '2px solid #2563EB' : '1px solid #CBD5E1', background: editingTask.dueDate === d ? '#EFF6FF' : '#FFF', fontWeight: 600, cursor: 'pointer' }}>{d}</button>
                        ))}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <button onClick={() => { setBacktracks(b => b + 1); setAdhdStep(1); }} style={{ padding: '10px 18px', borderRadius: '8px', border: '1px solid #CBD5E1', background: '#FFF', cursor: 'pointer' }}>← Back</button>
                        <button onClick={() => { recordClick(); setAdhdStep(3); }} style={{ padding: '10px 24px', borderRadius: '8px', border: 'none', backgroundColor: '#2563EB', color: '#FFF', fontWeight: 700, cursor: 'pointer' }}>Next →</button>
                      </div>
                    </div>
                  )}

                  {adhdStep === 3 && (
                    <div>
                      <h2 style={{ margin: '0 0 12px', fontSize: '18px' }}>Step 3: Reminder Setting</h2>
                      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
                        <button onClick={() => { recordClick(); setEditingTask({ ...editingTask, reminder: true }); }} style={{ flex: 1, padding: '16px', borderRadius: '8px', border: editingTask.reminder ? '2px solid #2563EB' : '1px solid #CBD5E1', background: editingTask.reminder ? '#EFF6FF' : '#FFF', fontWeight: 700, cursor: 'pointer' }}>🔔 ON</button>
                        <button onClick={() => { recordClick(); setEditingTask({ ...editingTask, reminder: false }); }} style={{ flex: 1, padding: '16px', borderRadius: '8px', border: !editingTask.reminder ? '2px solid #2563EB' : '1px solid #CBD5E1', background: !editingTask.reminder ? '#EFF6FF' : '#FFF', fontWeight: 700, cursor: 'pointer' }}>🔕 OFF</button>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <button onClick={() => { setBacktracks(b => b + 1); setAdhdStep(2); }} style={{ padding: '10px 18px', borderRadius: '8px', border: '1px solid #CBD5E1', background: '#FFF', cursor: 'pointer' }}>← Back</button>
                        <button onClick={saveEditedTask} style={{ padding: '12px 28px', borderRadius: '8px', border: 'none', backgroundColor: '#16A34A', color: '#FFF', fontWeight: 700, cursor: 'pointer' }}>✓ Save Corrections</button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ================= VARIANT C: ASD-ADAPTED ================= */}
          {variant === 'C' && (
            <div style={{ maxWidth: '1050px', margin: '24px auto', padding: '0 16px' }}>
              <header style={{ backgroundColor: '#E6ECE8', padding: '16px 24px', borderRadius: '8px', border: '2px solid #CBD5CE', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h1 style={{ margin: 0, fontSize: '18px', color: '#1E2D24' }}>TaskMaster — Structured Task Manager</h1>
                  <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#3D5245' }}>ASD-Adapted Mode: Predictable layout, literal text labels, and confirmation dialogs.</p>
                </div>
              </header>

              <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '20px' }}>
                <aside style={{ backgroundColor: '#FAFBF9', padding: '18px', borderRadius: '8px', border: '2px solid #CBD5CE' }}>
                  <h2 style={{ margin: '0 0 12px', fontSize: '15px', color: '#1E2D24' }}>1. Task Lists</h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
                    {lists.map(l => (
                      <button key={l} onClick={() => { recordClick(); setSelectedList(l); }} style={{ padding: '10px', textAlign: 'left', borderRadius: '6px', border: selectedList === l ? '2px solid #2F5D46' : '1px solid #CBD5CE', backgroundColor: selectedList === l ? '#DCE7E0' : '#FFF', fontWeight: 600, cursor: 'pointer' }}>
                        📁 {l}
                      </button>
                    ))}
                  </div>

                  <form onSubmit={addList} style={{ borderTop: '2px solid #E2E8E4', paddingTop: '16px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>Create New List:</label>
                    <input type="text" placeholder="e.g., Trip" value={newListName} onChange={e => setNewListName(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #94A39B', marginBottom: '10px', boxSizing: 'border-box' }} />
                    <button type="submit" style={{ width: '100%', padding: '8px', backgroundColor: '#2F5D46', color: '#FFF', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>➕ Add List</button>
                  </form>
                </aside>

                <main style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <section style={{ backgroundColor: '#FAFBF9', padding: '18px', borderRadius: '8px', border: '2px solid #CBD5CE' }}>
                    <h2 style={{ margin: '0 0 12px', fontSize: '15px', color: '#1E2D24' }}>2. Add Task to "{selectedList}"</h2>
                    <form onSubmit={addTask} style={{ display: 'grid', gridTemplateColumns: '1fr 150px 150px auto', gap: '10px', alignItems: 'end' }}>
                      <input type="text" placeholder="Task title..." value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #94A39B' }} />
                      <select value={newTaskDate} onChange={e => setNewTaskDate(e.target.value)} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #94A39B' }}>
                        {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                      <select value={newTaskReminder ? 'yes' : 'no'} onChange={e => setNewTaskReminder(e.target.value === 'yes')} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #94A39B' }}>
                        <option value="no">🔕 OFF</option>
                        <option value="yes">🔔 ON</option>
                      </select>
                      <button type="submit" style={{ padding: '9px 14px', backgroundColor: '#2F5D46', color: '#FFF', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>Save</button>
                    </form>
                  </section>

                  <section style={{ backgroundColor: '#FAFBF9', padding: '18px', borderRadius: '8px', border: '2px solid #CBD5CE' }}>
                    <h2 style={{ margin: '0 0 12px', fontSize: '15px', color: '#1E2D24' }}>3. Tasks in "{selectedList}"</h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {currentListTasks.map(task => (
                        <div key={task.id} style={{ padding: '12px', borderRadius: '6px', border: '1px solid #CBD5CE', backgroundColor: '#FFF', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ fontSize: '15px', fontWeight: 700 }}>{task.title}</div>
                            <div style={{ fontSize: '12px', color: '#3D5245', marginTop: '2px' }}>
                              📁 <b>{task.list}</b> • 📅 <b>{task.dueDate}</b> • 🔔 <b>{task.reminder ? 'ON' : 'OFF'}</b> • <b>{task.completed ? 'Done' : 'Not Done'}</b>
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button onClick={() => toggleComplete(task)} style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #94A39B', background: task.completed ? '#DCE7E0' : '#FFF', cursor: 'pointer', fontWeight: 600, fontSize: '12px' }}>
                              {task.completed ? 'Mark Incomplete' : 'Mark Done'}
                            </button>
                            <button onClick={() => toggleReminderQuick(task)} style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #94A39B', background: '#FFF', cursor: 'pointer', fontWeight: 600, fontSize: '12px' }}>
                              Reminder
                            </button>
                            <button onClick={() => { recordClick(); setEditingTask({ ...task }); }} style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #2F5D46', background: '#E6ECE8', cursor: 'pointer', fontWeight: 700, fontSize: '12px' }}>
                              Edit
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {editingTask && (
                      <div style={{ marginTop: '16px', padding: '14px', borderRadius: '8px', border: '2px solid #2F5D46', backgroundColor: '#E6ECE8' }}>
                        <h3 style={{ margin: '0 0 10px', fontSize: '14px' }}>Editing: "{editingTask.title}"</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '12px' }}>
                          <select value={editingTask.list} onChange={e => setEditingTask({ ...editingTask, list: e.target.value })} style={{ padding: '6px' }}>
                            {lists.map(l => <option key={l} value={l}>{l}</option>)}
                          </select>
                          <select value={editingTask.dueDate} onChange={e => setEditingTask({ ...editingTask, dueDate: e.target.value })} style={{ padding: '6px' }}>
                            {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                          </select>
                          <select value={editingTask.reminder ? 'on' : 'off'} onChange={e => setEditingTask({ ...editingTask, reminder: e.target.value === 'on' })} style={{ padding: '6px' }}>
                            <option value="on">Reminder ON</option>
                            <option value="off">Reminder OFF</option>
                          </select>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button onClick={saveEditedTask} style={{ padding: '6px 14px', backgroundColor: '#2F5D46', color: '#FFF', border: 'none', borderRadius: '6px', fontWeight: 700, cursor: 'pointer' }}>Confirm & Save</button>
                          <button onClick={() => { setBacktracks(b => b + 1); setEditingTask(null); }} style={{ padding: '6px 14px', backgroundColor: '#FFF', border: '1px solid #94A39B', borderRadius: '6px', cursor: 'pointer' }}>Cancel</button>
                        </div>
                      </div>
                    )}
                  </section>
                </main>
              </div>

              {asdConfirm && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
                  <div style={{ backgroundColor: '#FAFBF9', padding: '24px', borderRadius: '8px', border: '2px solid #2F5D46', maxWidth: '400px', width: '100%' }}>
                    <h3 style={{ margin: '0 0 10px' }}>🛡️ {asdConfirm.title}</h3>
                    <p style={{ margin: '0 0 20px', fontSize: '14px' }}>{asdConfirm.message}</p>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                      <button onClick={() => { setBacktracks(b => b + 1); setAsdConfirm(null); }} style={{ padding: '8px 14px', background: '#FFF', border: '1px solid #94A39B', borderRadius: '6px', cursor: 'pointer' }}>Go Back</button>
                      <button onClick={asdConfirm.onConfirm} style={{ padding: '8px 14px', background: '#2F5D46', color: '#FFF', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 700 }}>Confirm</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ================= SCREEN 3: COMPLETION / DEBRIEF ================= */}
      {screen === 'completion' && (
        <div style={{ maxWidth: '550px', margin: '80px auto', backgroundColor: '#FFF', padding: '32px', borderRadius: '12px', textAlign: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
          <h1 style={{ color: '#16A34A', marginBottom: '12px' }}>Session Completed Successfully!</h1>
          <p style={{ color: '#475569', marginBottom: '24px', lineHeight: 1.5 }}>
            Thank you for participating. Your performance telemetry and task inputs have been securely logged in the background.
          </p>
          <button
            onClick={() => setScreen('screening')}
            style={{ padding: '12px 24px', backgroundColor: '#2563EB', color: '#FFF', border: 'none', borderRadius: '6px', fontWeight: 700, cursor: 'pointer' }}
          >
            Start New Participant Session
          </button>
          <div style={{ marginTop: '20px' }}>
            <button onClick={() => setScreen('researcher')} style={{ background: 'none', border: 'none', color: '#2563EB', fontSize: '13px', cursor: 'pointer', textDecoration: 'underline' }}>
              Open Researcher Portal to Export Logs
            </button>
          </div>
        </div>
      )}

      {/* ================= SCREEN 4: RESEARCHER PORTAL (VIEW LOGS & EXPORT CSV) ================= */}
      {screen === 'researcher' && (
        <div style={{ maxWidth: '900px', margin: '40px auto', backgroundColor: '#FFF', padding: '28px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '2px solid #E2E8F0', paddingBottom: '12px' }}>
            <h1 style={{ margin: 0, fontSize: '20px', color: '#0F172A' }}>🔒 Researcher Portal: Collected Study Logs</h1>
            <button onClick={() => setScreen('screening')} style={{ padding: '8px 14px', backgroundColor: '#475569', color: '#FFF', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}>
              ← Back to App
            </button>
          </div>

          <p style={{ color: '#64748B', fontSize: '13px', marginBottom: '20px' }}>
            All participant sessions are automatically logged here in your browser storage. You can view metrics or export them for data analysis in SPSS/Python.
          </p>

          <div style={{ overflowX: 'auto', marginBottom: '20px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#F1F5F9', borderBottom: '2px solid #CBD5E1' }}>
                  <th style={{ padding: '10px' }}>ID</th>
                  <th style={{ padding: '10px' }}>Age</th>
                  <th style={{ padding: '10px' }}>Group</th>
                  <th style={{ padding: '10px' }}>Variant</th>
                  <th style={{ padding: '10px' }}>Time (s)</th>
                  <th style={{ padding: '10px' }}>Clicks</th>
                  <th style={{ padding: '10px' }}>Errors</th>
                  <th style={{ padding: '10px' }}>Backtracks</th>
                </tr>
              </thead>
              <tbody>
                {JSON.parse(localStorage.getItem('tm_study_logs') || '[]').length === 0 ? (
                  <tr>
                    <td colSpan="8" style={{ padding: '20px', textAlign: 'center', color: '#94A3B8' }}>No participant logs recorded yet. Run a session first!</td>
                  </tr>
                ) : (
                  JSON.parse(localStorage.getItem('tm_study_logs') || '[]').map((log, index) => (
                    <tr key={index} style={{ borderBottom: '1px solid #E2E8F0' }}>
                      <td style={{ padding: '10px', fontWeight: 600 }}>{log.participantId}</td>
                      <td style={{ padding: '10px' }}>{log.participantAge}</td>
                      <td style={{ padding: '10px' }}>{log.diagnosisGroup}</td>
                      <td style={{ padding: '10px' }}>Variant {log.variantTested}</td>
                      <td style={{ padding: '10px' }}>{log.durationSeconds}s</td>
                      <td style={{ padding: '10px' }}>{log.metrics.totalClicks}</td>
                      <td style={{ padding: '10px', color: '#DC2626' }}>{log.metrics.errorsOrDistractions}</td>
                      <td style={{ padding: '10px', color: '#D97706' }}>{log.metrics.backtracks}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={() => {
                const logs = localStorage.getItem('tm_study_logs') || '[]';
                const blob = new Blob([logs], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'taskmaster_study_logs.json';
                a.click();
              }}
              style={{ padding: '10px 18px', backgroundColor: '#2563EB', color: '#FFF', border: 'none', borderRadius: '6px', fontWeight: 700, cursor: 'pointer' }}
            >
              📥 Export Logs as JSON
            </button>
            <button
              onClick={() => {
                if (confirm('Are you sure you want to clear all stored study logs?')) {
                  localStorage.removeItem('tm_study_logs');
                  setScreen('screening');
                }
              }}
              style={{ padding: '10px 18px', backgroundColor: '#EF4444', color: '#FFF', border: 'none', borderRadius: '6px', fontWeight: 700, cursor: 'pointer' }}
            >
              🗑️ Clear All Logs
            </button>
          </div>
        </div>
      )}

    </div>
  );
}