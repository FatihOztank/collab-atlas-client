import { app } from 'electron';
import serve from 'electron-serve';
import { createWindow } from './helpers';
import 'dotenv/config';
app.commandLine.appendSwitch('disable-site-isolation-trials') // keep an eye on this. It might cause an issue later(low prio)

const isProd = process.env.NODE_ENV === 'production';

if (isProd) {
  serve({ directory: 'app' });
} else {
  app.setPath('userData', `${app.getPath('userData')} (development)`);
}

(async () => {
  await app.whenReady();

  const mainWindow = createWindow('main', {
    width: 1000,
    height: 600,
    autoHideMenuBar:true,
    webPreferences: {
      nodeIntegration:true,
      webSecurity:false // I know no workaround for this current moment
    }
  });
  mainWindow.maximize();
  

  if (isProd) {
    await mainWindow.loadURL('app://./home.html');
  } else {
    const port = process.argv[2];
    await mainWindow.loadURL(`http://localhost:${port}/home`);
    //mainWindow.webContents.openDevTools();
  }
})();

app.on('window-all-closed', () => {
  app.quit();
});
