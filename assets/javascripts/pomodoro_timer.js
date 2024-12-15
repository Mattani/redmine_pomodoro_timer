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

  // タイマー関連の処理
  let timer;
  const defaultDuration = 25 * 60 * 1000; // 25分
  let remainingTime = defaultDuration;

  const updateTimerDisplay = (isWork) => {
    const minutes = Math.floor(remainingTime / 60000);
    const seconds = Math.floor((remainingTime % 60000) / 1000);
    timeRemaining.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
  
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
    if (isWork) {
      sessionType.textContent = 'Work Session';
    } else {
      sessionType.textContent = 'Rest Session';
    }
  };

  const logTimeToServer = () => {
    fetch('/redmine/pomodoro_timer/log_time', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]').content
      },
      body: JSON.stringify({
        issue_id: document.querySelector('meta[name="issue-id"]').content,
        hours: 0.5,
        activity_id: activitySelect.value,
        comments: commentsInput.value
      })
    })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        alert(data.message);
      } else {
        alert(`Error: ${data.message}`);
      }
    })
    .catch(error => console.error('Error:', error));
  };  

  // イベントリスナーの設定
  // Workタイマーの場合
  startButton.addEventListener('click', () => {
    const startTime = Date.now();
    timer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      remainingTime = defaultDuration - elapsed;

      if (remainingTime <= 0) {
        clearInterval(timer);
        remainingTime = 0;
        updateTimerDisplay(true); // 次にRestに移る
        logTimeToServer();
        alert('Pomodoro complete!');
        startButton.disabled = false;
        stopButton.disabled = true;
      } else {
        updateTimerDisplay(true); // Work中
      }
    }, 990);

    startButton.disabled = true;
    stopButton.disabled = false;
  });

// Restタイマーの処理も同様に設定
  stopButton.addEventListener('click', () => {
    clearInterval(timer);
    logTimeToServer();
    startButton.disabled = false;
    stopButton.disabled = true;
    remainingTime = defaultDuration;
    updateTimerDisplay(false); // Rest中
  });
  updateTimerDisplay(false);

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

  // 初期ロード
  fetchTimeEntries();
});


