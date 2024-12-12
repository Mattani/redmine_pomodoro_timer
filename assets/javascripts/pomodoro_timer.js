// assets/javascripts/pomodoro_timer.js

document.addEventListener('DOMContentLoaded', () => {
    const startButton = document.getElementById('start-timer');
    const stopButton = document.getElementById('stop-timer');
    const pauseButton = document.getElementById('pause-timer');
    const activitySelect = document.getElementById('activity');
    const commentsInput = document.getElementById('comments');
    const timeRemaining = document.getElementById('time-remaining');
    
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
  
    const updateTimerDisplay = () => {
      const minutes = Math.floor(remainingTime / 60000);
      const seconds = Math.floor((remainingTime % 60000) / 1000);
      timeRemaining.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
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
    startButton.addEventListener('click', () => {
      const startTime = Date.now();
      timer = setInterval(() => {
        const elapsed = Date.now() - startTime;
        remainingTime = defaultDuration - elapsed;
  
        if (remainingTime <= 0) {
          clearInterval(timer);
          remainingTime = 0;
          updateTimerDisplay();
          logTimeToServer();
          alert('Pomodoro complete!');
          startButton.disabled = false;
          stopButton.disabled = true;
        } else {
          updateTimerDisplay();
        }
      }, 1000);
  
      startButton.disabled = true;
      stopButton.disabled = false;
    });
  
    stopButton.addEventListener('click', () => {
      clearInterval(timer);
      logTimeToServer();
      startButton.disabled = false;
      stopButton.disabled = true;
      remainingTime = defaultDuration;
      updateTimerDisplay();
    });
  
    updateTimerDisplay();
  });
  