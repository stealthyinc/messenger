Running Android in Studio With a Debugger
********************************************************************************
1. To get Android working, open a separate terminal in this directory. Then run the metro bundler:
        npm run start

2. Open a Chrome tab to http://localhost:8081/debugger-ui/
        - if you don't do this, it will open to some address that doesn't work in the next step.

3. Press debug play (the play button with the gear) in Android studio after opening the project.
4. Press Cmd + M to get the react menu in the emmulator and select debug, hot reload, and live reload

If you need to paste things into the emulator and the paste operation is doing strange things, use this command:
        - adb shell input text "<some text>"


Running Android from the Command Line 
********************************************************************************
From the stealthyMobile folder:
        react-native run-android
(Doesn't work from another folder)
