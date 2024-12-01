class PomodoroTimerController < ApplicationController
  before_action :find_issue, only: [:index, :log_time]

  def index
    # タイマー画面を表示
  end

  def log_time
    @time_entry = TimeEntry.new(
      project: @issue.project,
      issue: @issue,
      user: User.current,
      hours: params[:hours],
      activity_id: TimeEntryActivity.default.id, # 適切なアクティビティIDを設定
      spent_on: Date.today,
      comments: params[:comments]
    )

    if @time_entry.save
      render json: { status: 'success', message: 'Time entry logged successfully.' }
    else
      render json: { status: 'error', errors: @time_entry.errors.full_messages }
    end
  end

  private

  def find_issue
    @issue = Issue.find(params[:issue_id])
  end
end

