@echo off
cd packages
for /d %%D in (*) do (
    if not "%%D"=="." if not "%%D"==".." (
        cd "%%D"
        echo %%D
        call npm run build
        cd ..
    )
)
cd ..
