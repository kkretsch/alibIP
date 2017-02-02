

# Vocab



## Usage

## systemd startup
/etc/systemd/system/iplog.service:

[Unit]
Description=Node.js iplog server
Requires=After=mysql.service       # Requires the mysql service to run first

[Service]
ExecStartPre=/usr/bin/npm run email-build
ExecStart=/usr/bin/node /var/www/iplog/app.js
Restart=always
SyslogIdentifier=NodejsIplog
User=www-data
Group=www-data
Environment=NODE_ENV=production
Environment=SERVER_PORT=3003
Environment=SERVER_IFACE=127.0.0.1
WorkingDirectory=/var/www/iplog
UMask=007

[Install]
WantedBy=multi-user.target

## Developing

## NGinx http header

add_header Strict-Transport-Security "max-age=63072000; ";
add_header X-Frame-Options "DENY";
add_header X-Content-Type-Options "nosniff";
add_header Content-Security-Policy "default-src https: 'unsafe-inline'; frame-ancestors 'none'; style-src 'self' https://netdna.bootstrapcdn.com/; script-src 'self' 'unsafe-inline' https://stat.myocastor.de/ https://code.jquery.com/ https://netdna.bootstrapcdn.com/";



### Tools

Created with [Nodeclipse](https://github.com/Nodeclipse/nodeclipse-1)
 ([Eclipse Marketplace](http://marketplace.eclipse.org/content/nodeclipse), [site](http://www.nodeclipse.org))   

Nodeclipse is free open-source project that grows with your contributions.
