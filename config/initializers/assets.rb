# config/initializers/assets.rb
Rails.application.config.assets.paths << Rails.root.join('plugins', 'redmine_pomodoro_timer', 'assets', 'javascripts')
Rails.application.config.assets.precompile += %w(plugin_assets/redmine_pomodoro_timer/javascripts/pomodoro_timer.js)
