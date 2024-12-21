// assets/javascripts/pomodoro_timer.js

document.addEventListener('DOMContentLoaded', () => {
  const baseUrl = document.querySelector('meta[name="base-url"]').content;
  const startButton = document.getElementById('start-timer');
  const stopButton = document.getElementById('stop-timer');
  const skipButton = document.getElementById('skip-timer');
  const pauseButton = document.getElementById('pause-timer');
  const activitySelect = document.getElementById('activity');
  const commentsInput = document.getElementById('comments');
  const timeRemaining = document.getElementById('time-remaining');
  const timeEntriesContainer = document.getElementById('time-entries-container');
  const issueId = document.querySelector('meta[name="issue-id"]').content
  const submitButton = document.getElementById("modalSubmitButton");
  const cancelButton = document.getElementById("modalCancelButton");

  // 作業分類の取得とプルダウンの初期化
  console.log('fetch time entry activities')
  fetch('/redmine/enumerations/time_entry_activities.json', {
    headers: {
    'X-Redmine-API-Key': '<%= User.current.api_key %>' // APIキーを利用
    }
  })
  .then(response => response.json())
  .then(data => {
    const activitySelect = document.getElementById('activity');
    data.time_entry_activities.forEach(activity => {
    const option = document.createElement('option');
    option.value = activity.id;
    option.textContent = activity.name;
    activitySelect.appendChild(option);
    });
  })
  .catch(error => console.error('Error fetching activities:', error));

  const updateTimerDisplay = () => {

    setTimerDisplay(remainingTime);
    // タイマーの状態に応じてクラスを切り替える
    if (currentTimerType === "work") {
      timeRemaining.classList.add('work');
      timeRemaining.classList.remove('rest');
      updateSessionType(true);
    } else {
      timeRemaining.classList.add('rest');
      timeRemaining.classList.remove('work');
      updateSessionType(false);
    }
  };

  const updateSessionType = (isWork) => {
    const sessionType = document.getElementById('session-type');
    
    if (isWork === true) {
      sessionType.textContent = 'Work Session';
    } else if (isWork === false) {
      sessionType.textContent = 'Rest Session';
    } else {
      sessionType.textContent = 'Next: Work Session'; // isWork が null の場合
    }
  };

  const logTimeToServer = async (finalComment) => {
    console.log('logTimeToServer started!');
    try {
      const response = await fetch(`${baseUrl}/pomodoro_timer/log_time`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]').content,
        },
        body: JSON.stringify({
          issue_id: document.querySelector('meta[name="issue-id"]').content,
          hours: 0.5,
          activity_id: activitySelect.value,
          comments: finalComment
        }),
      });
      const result = await response.json();

      if (response.ok) {
        // alert(result.message || 'Time entry logged successfully!');
        // 成功時にテーブルを更新
        await fetchTimeEntries();
        // 準備しているタイマー（Rest）を開始
        // startTimer();
      } else {
        alert(result.message || 'Failed to log time entry.');
      }
    } catch (error) {
      alert('An error occurred while logging time.');
      console.error('Error:', error);
    }
  };

  let currentTimerType = null; // 現在動作中のタイマータイプ ("work" または "rest")
  let timer = null;            // 現在動作中のタイマーインスタンス
  let remainingTime = 0;       // 現在の残り時間
  
  /**
   * 次のタイマーの準備を行う関数
   * @param {string} type タイマーの種類 ("work" または "rest")
   * @param {number} duration タイマーの時間 (ミリ秒)
   */
  const prepareTimer = (type, duration) => {
    console.log('prepareTimer invoked',"(",type,",",duration,")");
    // 現在動作中のタイマーを停止
    if (timer) {
      clearInterval(timer);
      timer = null;
    }

    // 次のタイマーの準備
    currentTimerType = type;
    remainingTime = duration;

    // タイマーの初期状態を画面に反映
    if (type === "work") {
      updateTimerDisplay(true);  // Workタイマーの初期画面
      updateSessionType(true);   // Work Session表示
    } else if (type === "rest") {
      updateTimerDisplay(false); // Restタイマーの初期画面
      updateSessionType(false);  // Rest Session表示
    }
    startButton.disabled = false; // Startボタンをアクティブにする
  };

  /**
   * 現在準備されているタイマーを開始する関数
   */
  const startTimer = () => {
    console.log('startTimer invoked');
    startButton.disabled = true;
    if (!currentTimerType || remainingTime <= 0) {
      console.error("Timer is not properly prepared!");
      return;
    }

    // 1秒ごとに実行
    timer = setInterval(() => {
      remainingTime -= 1000; // 1秒減少

      // タイマーの表示更新
      // if (currentTimerType === "work") {
      //   updateTimerDisplay(true);
      // } else if (currentTimerType === "rest") {
      //   updateTimerDisplay(false);
      // }
      updateTimerDisplay();
      // タイマー終了処理
      if (remainingTime <= 0) {
        clearInterval(timer);
        timer = null;
        finishTimer();
        // if (currentTimerType === "work") {
        //   console.log("Work session completed!");
        //   showCommentModal(commentsInput.value);
        // } else if (currentTimerType === "rest") {
        //   console.log("Rest session completed!");
        //   alert("Rest time is over!");
        //   prepareTimer("work", 25 * 60 * 1000); // 次のWorkタイマー準備
        // }

        currentTimerType = null; // 状態リセット
      }
    }, 990); // 1秒間隔
  };


  // イベントリスナーの設定
  // Workタイマーの処理
  startButton.addEventListener("click", () => {
    startButton.disabled = true;
    skipButton.disabled = false;
    startTimer();
  });

  // startButton.addEventListener('click', () => {
  //   console.log('Work Timer started!');
  //   const startTime = Date.now();
  //   timer = setInterval(() => {
  //     const elapsed = Date.now() - startTime;
  //     remainingTime = defaultDuration - elapsed;

  //     if (remainingTime <= 0) {
  //       console.log('Work Timer over!');
  //       clearInterval(timer);
  //       remainingTime = 0;
  //       updateTimerDisplay(true); // Workタイマーの表示更新
  //       showCommentModal(commentsInput.value);
      
  //       // モーダル送信後、Restタイマーを開始
  //       submitButton.addEventListener("click", () => {
  //         const modalInput = document.getElementById("modalCommentInput");
  //         const finalComment = modalInput.value;
      
  //         submitCommentToTimeEntry(finalComment);
  //         closeCommentModal();
  //       });
  //       startButton.disabled = false;
  //       stopButton.disabled = true;
  //     } else {
  //       updateTimerDisplay(true); // Work中
  //     }
  //   }, 990);

  //   startButton.disabled = true;
  //   stopButton.disabled = false;
  // });

  // Restタイマーの処理
  submitButton.addEventListener("click", () => {
    submitCommentToTimeEntry(); // コメントを送信
    closeCommentModal();
    prepareTimer("rest", 5 * 60 * 1000); // 5分のRest Timer
    startTimer();
  }); 

  // const startRestTimer = () => {
  //   console.log('Rest Timer started!');
  //   const restDuration = 5 * 60 * 1000; // 5分
  //   remainingTime = restDuration;
  //   startButton.disabled = true;
  //   stopButton.disabled = false;
  
  //   const startTime = Date.now();
  
  //   setTimerDisplay(restDuration);
  //   updateTimerDisplay(false); // Restタイマーの初期状態を表示
  //   timeRemaining.classList.add('rest');
  //   timeRemaining.classList.remove('work');
  
  //   timer = setInterval(() => {
  //     const elapsed = Date.now() - startTime;
  //     remainingTime = restDuration - elapsed;
  //     updateTimerDisplay(false);
  
  //     // Rest time over
  //     if (remainingTime <= 0) {
  //       console.log('Rest Timer over!');

  //       clearInterval(timer);
  //       remainingTime = defaultDuration;
  //       setTimerDisplay(remainingTime);
  //       updateSessionType(null);
  //       startButton.disabled = false;
  //       stopButton.disabled = true;
  //       console.log('Start Button Disabled:', startButton.disabled);
  //       console.log('Remaining Time:', remainingTime);
  //     } else {
  //       updateTimerDisplay(false); // Rest中
  //     }
  //   }, 990);
  // }; 

  skipButton.addEventListener('click', () => {
    console.log('Skip button clicked!');
    finishTimer();
  });

  // TimeEntriesを取得する関数
  const fetchTimeEntries = async () => {
    try {
      
      const response = await fetch(`${baseUrl}/pomodoro_timer/time_entries/${issueId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch time entries');
      }
      const timeEntries = await response.json();

      // 表形式で表示
      timeEntriesContainer.innerHTML = `
        <table class="time-entries-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Hours</th>
              <th>Activity</th>
              <th>User</th>
              <th>Comments</th>
            </tr>
          </thead>
          <tbody>
            ${timeEntries.reverse().map(entry => `
              <tr>
                <td>${entry.spent_on}</td>
                <td>${entry.hours}</td>
                <td>${entry.activity}</td>
                <td>${entry.user}</td>
                <td>${entry.comments}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    } catch (error) {
      timeEntriesContainer.innerHTML = `<p class="error">${error.message}</p>`;
    }
  };

  function finishTimer(){
    console.log("finishTimer invoked")
    console.log("currentTimerType=",currentTimerType);
    clearInterval(timer);
    if (currentTimerType === "work") {
      console.log("Work session completed!");
      showCommentModal(commentsInput.value);
    } else if (currentTimerType === "rest") {
      console.log("Rest session completed!");
      prepareTimer("work", 25 * 60 * 1000); // 次のWorkタイマー準備
      updateSessionType(null);
    }
  }

  function showCommentModal(timerComment) {
    console.log('Modal Activated!');
    const modal = document.getElementById("commentModal");
    const modalInput = document.getElementById("modalCommentInput");

    // タイマー画面のコメントをモーダルに引き継ぐ
    modalInput.value = timerComment || "";

    // モーダルを表示
    modal.style.display = "block";
  }

  function submitCommentToTimeEntry() {
    console.log('submitCommentToTimeEntry invoked');
    const modalInput = document.getElementById("modalCommentInput");
    const finalComment = modalInput.value;
  
    // TimeEntryにコメントを送信する
    logTimeToServer(finalComment);
    // logTimeToServer(finalComment).then(() => {
    //   // モーダルを非表示にする
    //   closeCommentModal();
    //   // 非同期処理完了後に準備しているタイマー（Rest）を開始
    //   prepareTimer("rest", 5 * 60 * 1000); // 5分のRest Timer
    //   startTimer();
    // });
 
  }

  function closeCommentModal() {
    console.log('Modal Closed!');
    const modal = document.getElementById("commentModal");
    modal.style.display = "none";
  }

  // submitButton.addEventListener("click", () => {
  //   console.log('Modal Submitted!');

  //   const modalInput = document.getElementById("modalCommentInput");
  //   const finalComment = modalInput.value;

  //   submitCommentToTimeEntry();
  //   // モーダルを非表示にする
  //   closeCommentModal();
  //   // Rest Timerを開始する
  //   // startRestTimer();
  // });

  function setTimerDisplay(Time){
    const minutes = Math.floor(Time / 60000);
    const seconds = Math.floor((Time % 60000) / 1000);
    timeRemaining.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  // 初期ロード
  // タイマー関連の処理
  // let timer;
  const defaultDuration = 25 * 60 * 1000; // 25分
  // let remainingTime = defaultDuration;
    
  fetchTimeEntries();
  // updateTimerDisplay(false);
  updateSessionType(null);
  prepareTimer("work", defaultDuration);
});


