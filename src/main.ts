// 시작점: 외부 요청 막기 → URL 매개변수 읽기 → App 만들기.
import './styles.css';
import { App } from './app/App.ts';
import { parseParams } from './app/params.ts';
import { installNetworkGuard } from './platform/networkGuard.ts';

installNetworkGuard();
const app = new App(parseParams(window.location.search));
app.init();
