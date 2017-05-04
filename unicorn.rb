@dir = "/var/www/uploader/"

worker_processes 8
working_directory @dir

timeout 300
listen "#{@dir}run/unicorn.sock"

stderr_path "#{@dir}log/unicorn.stderr.log"
stdout_path "#{@dir}log/unicorn.stdout.log"
