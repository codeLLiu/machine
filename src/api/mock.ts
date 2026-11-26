import type { CameraInfo } from './types'

export function camMockEnabled(): boolean {
  return import.meta.env.VITE_CAMERA_MOCK === '1'
}

const DEMO_RTSP = 'rtsp://demo:demo@camera.example.com:554/stream'

export const MOCK_CAMERAS: CameraInfo[] = [
  { id: 0, name: '舱内摄像头', rtsp: DEMO_RTSP, flv: '', isPushing: true, disabled: 0 },
  { id: 1, name: '舱门摄像头', rtsp: DEMO_RTSP, flv: '', isPushing: true, disabled: 0 },
  { id: 2, name: '舱外摄像头', rtsp: DEMO_RTSP, flv: '', isPushing: false, disabled: 0 },
  { id: 3, name: '东侧停机坪摄像头', rtsp: DEMO_RTSP, flv: '', isPushing: false, disabled: 0 },
  { id: 4, name: '西侧停机坪摄像头', rtsp: DEMO_RTSP, flv: '', isPushing: false, disabled: 1 },
  { id: 5, name: '充电区摄像头', rtsp: DEMO_RTSP, flv: '', isPushing: true, disabled: 0 },
  { id: 6, name: '起降区摄像头', rtsp: DEMO_RTSP, flv: '', isPushing: false, disabled: 0 },
  { id: 7, name: '环境监测摄像头', rtsp: DEMO_RTSP, flv: '', isPushing: false, disabled: 1 },
]
