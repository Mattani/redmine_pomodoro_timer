// assets/javascripts/pomodoro_timer.js

document.addEventListener('DOMContentLoaded', () => {
  const baseUrl = document.querySelector('meta[name="base-url"]').content;
  const startButton = document.getElementById('start-timer');
  const stopButton = document.getElementById('stop-timer');
  const pauseButton = document.getElementById('pause-timer');
  const activitySelect = document.getElementById('activity');
  const commentsInput = document.getElementById('comments');
  const timeRemaining = document.getElementById('time-remaining');
  const timeEntriesContainer = document.getElementById('time-entries-container');
  const issueId = document.querySelector('meta[name="issue-id"]').content
  const submitButton = document.getElementById("modalSubmitButton");
  const cancelButton = document.getElementById("modalCancelButton");

  // 作業分類の取得とプルダウンの初期化
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

  const updateTimerDisplay = (isWork) => {

    setTimerDisplay(remainingTime);
    // タイマーの状態に応じてクラスを切り替える
    if (isWork) {
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
        // Restタイマーを開始
        startRestTimer();
      } else {
        alert(result.message || 'Failed to log time entry.');
      }
    } catch (error) {
      alert('An error occurred while logging time.');
      console.error('Error:', error);
    }
  };

  // イベントリスナーの設定
  // Workタイマーの処理
  startButton.addEventListener('click', () => {
    console.log('Work Timer started!');
    const startTime = Date.now();
    timer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      remainingTime = defaultDuration - elapsed;

      if (remainingTime <= 0) {
        console.log('Work Timer over!');
        clearInterval(timer);
        remainingTime = 0;
        updateTimerDisplay(true); // Workタイマーの表示更新
        showCommentModal(commentsInput.value);
      
        // モーダル送信後、Restタイマーを開始
        submitButton.addEventListener("click", () => {
          const modalInput = document.getElementById("modalCommentInput");
          const finalComment = modalInput.value;
      
          submitCommentToTimeEntry(finalComment);
          closeCommentModal();
        });
        startButton.disabled = false;
        stopButton.disabled = true;
      } else {
        updateTimerDisplay(true); // Work中
      }
    }, 990);

    startButton.disabled = true;
    stopButton.disabled = false;
  });

  // Restタイマーの処理
  const startRestTimer = () => {
    console.log('Rest Timer started!');
    const restDuration = 5 * 60 * 1000; // 5分
    remainingTime = restDuration;
    startButton.disabled = true;
    stopButton.disabled = false;
  
    const startTime = Date.now();
  
    setTimerDisplay(restDuration);
    updateTimerDisplay(false); // Restタイマーの初期状態を表示
    timeRemaining.classList.add('rest');
    timeRemaining.classList.remove('work');
  
    timer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      remainingTime = restDuration - elapsed;
      updateTimerDisplay(false);
  
      // Rest time over
      if (remainingTime <= 0) {
        console.log('Rest Timer over!');

        clearInterval(timer);
        remainingTime = defaultDuration;
        setTimerDisplay(remainingTime);
        updateSessionType(null);
        startButton.disabled = false;
        stopButton.disabled = true;
        console.log('Start Button Disabled:', startButton.disabled);
        console.log('Remaining Time:', remainingTime);
      } else {
        updateTimerDisplay(false); // Rest中
      }
    }, 990);
  }; 

  stopButton.addEventListener('click', () => {
    console.log('Stop button clicked!');
    clearInterval(timer);
    showCommentModal(commentsInput.value);
    startButton.disabled = false;
    stopButton.disabled = true;
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
            ${timeEntries.map(entry => `
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
    console.log('submitCommentToTimeEntry!');
    const modalInput = document.getElementById("modalCommentInput");
    const finalComment = modalInput.value;
  
    // TimeEntryにコメントを送信する
    logTimeToServer(finalComment).then(() => {
      // モーダルを非表示にする
      closeCommentModal();
      // 非同期処理完了後にRest Timerを開始
      startRestTimer();
    });
 
  }

  function closeCommentModal() {
    console.log('Modal Closed!');
    const modal = document.getElementById("commentModal");
    modal.style.display = "none";
  }

  submitButton.addEventListener("click", () => {
    console.log('Modal Submitted!');

    const modalInput = document.getElementById("modalCommentInput");
    const finalComment = modalInput.value;

    submitCommentToTimeEntry();
    // モーダルを非表示にする
    closeCommentModal();
    // Rest Timerを開始する
    startRestTimer();
  });

  function setTimerDisplay(Time){
    const minutes = Math.floor(Time / 60000);
    const seconds = Math.floor((Time % 60000) / 1000);
    timeRemaining.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  // 初期ロード
  // タイマー関連の処理
  let timer;
  const defaultDuration = 25 * 60 * 1000; // 25分
  let remainingTime = defaultDuration;
    
  fetchTimeEntries();
  updateTimerDisplay(false);
  updateSessionType(null);
});


