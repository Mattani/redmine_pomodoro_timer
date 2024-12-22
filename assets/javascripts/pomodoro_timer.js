// assets/javascripts/pomodoro_timer.js

document.addEventListener('DOMContentLoaded', () => {
  const baseUrl = document.querySelector('meta[name="base-url"]').content;
  const startButton = document.querySelector('.play-icon');
  const pauseButton = document.querySelector('.pause-icon');
  const skipButton = document.querySelector('.skip-icon');
  const stopButton = document.querySelector('.stop-icon');
  const activitySelect = document.getElementById('activity');
  const commentsInput = document.getElementById('comments');
  const timeRemaining = document.getElementById('time-remaining');
  const timeEntriesContainer = document.getElementById('time-entries-container');
  const issueId = document.querySelector('meta[name="issue-id"]').content
  const submitButton = document.getElementById("modalSubmitButton");
  const continueButton = document.getElementById("modalContinueButton");
  const cancelButton = document.getElementById("modalCancelButton");
  const defaultDuration = 25 * 60 * 1000; // 25分

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
        // 成功時にテーブルを更新
        await fetchTimeEntries();
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
  let isPaused = false;        // ポーズ
  let startTime;               // タイマー開始時刻
  let preparedDuration;        // 準備したタイマーの長さ
  
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
    preparedDuration = duration;
    remainingTime = duration;

    // タイマーの初期状態を画面に反映
    if (type === "work") {
      updateTimerDisplay(true);  // Workタイマーの初期画面
      updateSessionType(null);   // Next:Work Session表示
    } else if (type === "rest") {
      updateTimerDisplay(false); // Restタイマーの初期画面
      updateSessionType(false);  // Rest Session表示
    }
    startButton.removeAttribute('disabled'); // Startボタンをアクティブにする
    pauseButton.setAttribute('disabled',true); // Pauseボタンをインアクティブにする
    skipButton.setAttribute('disabled',true); // Skipボタンをインアクティブにする
    stopButton.setAttribute('disabled',true); // Skipボタンをインアクティブにする
  };

  /**
   * 現在準備されているタイマーを開始する関数
   */
  const startTimer = () => {
    console.log('startTimer invoked');
    console.log('isPaused=', isPaused);
    console.log('remainingTime=', remainingTime);
  
    startButton.setAttribute('disabled',true);  // Startボタンをインアクティブにする
    pauseButton.removeAttribute('disabled');    // Pauseボタンをアクティブにする
    skipButton.removeAttribute('disabled');  // Skipボタンをアクティブにする
    stopButton.removeAttribute('disabled');  // Skipボタンをアクティブにする
  
    if (isPaused) {
      // 一時停止後に再開
      startTime = Date.now() - elapsedTime;  // 再開する時の開始時間
      isPaused = false;  // 一時停止状態を解除
    } else {
      // 初めてタイマーを開始する場合
      startTime = Date.now();
    }
  
    // タイマーの更新
    timer = setInterval(() => {
      elapsedTime = Date.now() - startTime;  // 経過時間を更新
      remainingTime = Math.max(0, preparedDuration - elapsedTime);  // 残り時間を更新
      updateTimerDisplay();  // タイマーの表示を更新
  
      // タイマー終了処理
      if (remainingTime <= 0) {
        clearInterval(timer);
        timer = null;
        finishTimer();
        currentTimerType = null; // 状態リセット
      }
    }, 990); // 1秒間隔で更新
  };

  // startボタンでタイマーを開始
  startButton.addEventListener("click", () => {
    startTimer();
  });

  // pauseボタンでタイマーを一時停止
  pauseButton.addEventListener("click", () => {
    console.log('Pause button clicked!');
    pauseTimer();
  });

  // skipボタンで現在のタイマーを終わらせる
  skipButton.addEventListener('click', () => {
    console.log('Skip button clicked!');
    finishTimer();
  });

  // stopボタンでタイマーを終わらせ、初期画面に戻る
  stopButton.addEventListener('click', () => {
    console.log('Stop button clicked!');
    const isConfirmed = confirm("中断してよろしいですか？");
    if (isConfirmed) {
      console.log("timer stopped by user");
      prepareTimer("work", defaultDuration);
    } else {
      // キャンセルが選ばれた場合の処理
      console.log("stop canceled by user");
    }
  });

  // ModalのSubmitでコメントを送信し、その後Rest Timerを開始する
  submitButton.addEventListener("click", () => {
    console.log('Submit button clicked!');
    submitCommentToTimeEntry(); // コメントを送信
    closeCommentModal();
    prepareTimer("rest", 5 * 60 * 1000); // 5分のRest Timer
    startTimer();
  }); 

  // ModalのContinueでもとのタイマーに戻る
  continueButton.addEventListener("click", () => {
    console.log('Continue button clicked!');
    closeCommentModal();
    console.log(remainingTime);
    startTimer();
  }); 

  // ModalのCancelでRest Timerを開始する（コメントは送信しない）
  cancelButton.addEventListener("click", () => {
    console.log('Cancel button clicked!');
    closeCommentModal();
    prepareTimer("rest", 5 * 60 * 1000); // 5分のRest Timer
    startTimer();
  }); 

  // タイマーを一時停止する関数
  const pauseTimer = () => {
    clearInterval(timer);
    isPaused = true;
    startButton.removeAttribute('disabled');
    pauseButton.setAttribute('disabled',true);
  };

  // TimeEntriesを取得する関数
  const fetchTimeEntries = async () => {
    try {
      const response = await fetch(`${baseUrl}/pomodoro_timer/time_entries/${issueId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch time entries');
      }
      const timeEntries = await response.json();

      // Hoursの合計を計算
      const totalHours = timeEntries.reduce((sum, entry) => sum + parseFloat(entry.hours || 0), 0);

      // 合計を表示
      const totalHoursElement = document.getElementById("hours-total-value");
      totalHoursElement.textContent = totalHours.toFixed(1); 

      const estimatedHours = document.querySelector('meta[name="issue-estimated-hours"]').content
      const hoursPercentageElement = document.getElementById("hours-percentage");
      // パーセンテージの計算と更新
      if (estimatedHours > 0) {
        const percentage = (totalHours / estimatedHours) * 100;
        hoursPercentageElement.textContent = percentage.toFixed(0);
      } else {
        hoursPercentageElement.textContent = 'N/A';
      }

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
  }

  function closeCommentModal() {
    console.log('Modal Closed!');
    const modal = document.getElementById("commentModal");
    modal.style.display = "none";
  }

  function setTimerDisplay(Time){
    let timeRemainingText;
    const minutes = Math.floor(Time / 60000);
    const seconds = Math.floor((Time % 60000) / 1000);
    timeRemainingText = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    timeRemaining.textContent = timeRemainingText;
    document.title = `${timeRemainingText} - Pomodoro Timer`;
  }

  // 初期ロード
  // タイマー関連の処理
  fetchTimeEntries();
  prepareTimer("work", defaultDuration);
});


