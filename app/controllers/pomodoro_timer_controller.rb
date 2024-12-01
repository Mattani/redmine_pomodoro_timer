class PomodoroTimerController < ApplicationController
  before_action :find_issue, only: [:index, :log_time]

  def index
    @issue = Issue.find(params[:issue_id])
    @api_key = User.current.api_key
    # タイマー画面を表示
  end

  private

  def find_issue
    @issue = Issue.find(params[:issue_id])
  end
end

