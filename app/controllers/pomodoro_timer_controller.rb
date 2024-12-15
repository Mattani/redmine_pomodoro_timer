class PomodoroTimerController < ApplicationController
  before_action :find_issue, only: [:index, :log_time, :time_entries]
  layout 'base'

  def index
    @issue = Issue.find(params[:issue_id])
    @activities = TimeEntryActivity.where(active: true).map { |a| { id: a.id, name: a.name } }
    # タイマー画面を表示
  end

  def log_time
    time_entry = TimeEntry.new(
      issue: @issue,
      user: User.current, # 現在ログインしているユーザー
      hours: params[:hours],
      activity_id: params[:activity_id],
      comments: params[:comments],
      spent_on: Date.today
    )

    if time_entry.save
      render json: { success: true, message: 'Time entry logged successfully.' }, status: :ok
    else
      render json: { success: false, message: 'Failed to log time entry.', errors: time_entry.errors.full_messages }, status: :unprocessable_entity
    end
  end

  def time_entries
    @time_entries = @issue.time_entries.includes(:user, :activity)

    render json: @time_entries.map { |entry|
      {
        id: entry.id,
        hours: entry.hours,
        comments: entry.comments,
        activity: entry.activity.name,
        user: entry.user.name,
        spent_on: entry.spent_on
      }
    }
  end

  private

  def find_issue
    @issue = Issue.find_by_id(params[:issue_id])
    render json: { success: false, message: 'Issue not found.' }, status: :not_found unless @issue
  end
end

