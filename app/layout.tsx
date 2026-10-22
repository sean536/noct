import type { Metadata, Viewport } from 'next';
import 'maplibre-gl/dist/maplibre-gl.css';
import './globals.css';
export const metadata: Metadata = {title:'NOCT — Find your after dark.',description:'Entdecke deinen Berlin-Vibe. Echte Berliner Luftbilder, reale Locations und quellengeprüfte Veranstaltungen.'};
export const viewport: Viewport = {width:'device-width', initialScale:1, viewportFit:'cover',themeColor:'#f5f5f7'};
export default function RootLayout({children}:{children:React.ReactNode}) {return <html lang="de"><body>{children}</body></html>}
