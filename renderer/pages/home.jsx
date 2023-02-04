import React, { useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import dynamic from 'next/dynamic';
import { SocketService } from "../services/socketService"

const CollabIframe = dynamic(() => {
	return import('../components/CollabIframe')
}, { ssr: false })

function Home() {
	const [isSecondIframeOpen, setIsSecondIframeOpen] = useState(false);
	const buttonHandler = () => {
		setIsSecondIframeOpen(!isSecondIframeOpen);
		SocketService.emit("iframeToggle", {});
	};

	SocketService.on("secondIframeToggled", () => {
		setIsSecondIframeOpen(!isSecondIframeOpen);
	})

	return (
		<>
			<Head>
				<title>Collaborative Atlas</title>
			</Head>
			<main id='__app' className="flex-container">
				{<div className="flex-child">
					<CollabIframe iframeIndex={1} />
				</div>}
				{isSecondIframeOpen && <div className="flex-child">
					<CollabIframe iframeIndex={2} />
				</div>}
			<div>

			</div>
			</main>
			<button onClick={() => buttonHandler()} style={{position: "fixed", color: "blue", height: "8%", top: "90%"}}>Toggle Second Iframe</button>
		</>
	);
}

export default Home;
