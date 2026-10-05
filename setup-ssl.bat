@echo off
echo ===================================================
echo   WINGTRACK - Install Trusted Local SSL Certificate
echo ===================================================
echo.
echo Installing mkcert Local CA to your Windows Certificate Store...
mkcert -install
echo.
echo Re-generating Wingtrack SSL certificates...
mkcert -cert-file client\certs\wingtrack.pem -key-file client\certs\wingtrack-key.pem wingtrack localhost 127.0.0.1 ::1
echo.
echo ===================================================
echo   DONE! You can now open: https://wingtrack/
echo   (No "Not secure" warning!)
echo ===================================================
pause
