import type { Metadata } from "next";
import "./globals.css";
export const metadata:Metadata={title:"Commonplace — Agent documents",description:"One document. Independent agents. Your complete picture.",icons:{icon:"/favicon.svg"}};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
