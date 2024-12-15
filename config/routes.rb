# Plugin's routes
# See: http://guides.rubyonrails.org/routing.html

get 'pomodoro_timer/:issue_id', to: 'pomodoro_timer#index', as: 'pomodoro_timer'
post 'pomodoro_timer/log_time', to: 'pomodoro_timer#log_time'

RedmineApp::Application.routes.draw do
  match 'pomodoro_timer/time_entries/:issue_id', to: 'pomodoro_timer#time_entries', via: :get
end


