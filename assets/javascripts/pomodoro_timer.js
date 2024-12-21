// assets/javascripts/pomodoro_timer.js

document.addEventListener('DOMContentLoaded', () => {
  const baseUrl = document.querySelector('meta[name="base-url"]').content;
  const startButton = document.getElementById('start-timer');
  const skipButton = document.getElementById('skip-timer');
  const pauseButton = document.getElementById('pause-timer');
  const activitySelect = document.getElementById('activity');
  const commentsInput = document.getElementById('comments');
  const timeRemaining = document.getElementById('time-remaining');
  const timeEntriesContainer = document.getElementById('time-entries-container');
  const issueId = document.querySelector('meta[name="issue-id"]').content
  const submitButton = document.getElementById("modalSubmitButton");
  const continueButton = document.getElementById("modalContinueButton");
  const cancelButton = document.getElementById("modalCancelButton");

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
      updateSessionType(null);   // Next:Work Session表示
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
    startButton.disabled = true;  // startボタンをインアクティブにする
    pauseButton.disabled = false; // pauseボタンをアクティブにする
    skipButton.disabled = false;  // skipボタンをアクティブにする
    updateTimerDisplay();
    if (!currentTimerType || remainingTime <= 0) {
      console.error("Timer is not properly prepared!");
      return;
    }

    // 1秒ごとに実行
    timer = setInterval(() => {
      remainingTime -= 1000; // 1秒減少

      // タイマーの表示更新
      updateTimerDisplay();
      // タイマー終了処理
      if (remainingTime <= 0) {
        clearInterval(timer);
        timer = null;
        finishTimer();
        currentTimerType = null; // 状態リセット
      }
    }, 990); // 1秒間隔
  };

  // イベントリスナーの設定
  // Workタイマーの処理
  startButton.addEventListener("click", () => {
    skipButton.disabled = false;
    startTimer();
  });

  skipButton.addEventListener('click', () => {
    console.log('Skip button clicked!');
    finishTimer();
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
  }

  function closeCommentModal() {
    console.log('Modal Closed!');
    const modal = document.getElementById("commentModal");
    modal.style.display = "none";
  }

  function setTimerDisplay(Time){
    const minutes = Math.floor(Time / 60000);
    const seconds = Math.floor((Time % 60000) / 1000);
    timeRemaining.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  // 初期ロード
  // タイマー関連の処理
  const defaultDuration = 25 * 60 * 1000; // 25分
  fetchTimeEntries();
  prepareTimer("work", defaultDuration);
});


