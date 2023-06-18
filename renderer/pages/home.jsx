import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import dynamic from 'next/dynamic';
import { SocketService } from "../services/socketService"
import Button from '@mui/material/Button';

const CollabIframe = dynamic(() => {
	return import('../components/CollabIframe')
}, { ssr: false })

function Home() {
	const [isSecondIframeOpen, setIsSecondIframeOpen] = useState(false);

	const buttonHandler = () => {
		setIsSecondIframeOpen(!isSecondIframeOpen);
		SocketService.emit("iframeToggle", {});
	};

	useEffect(() => {
		const toggleSecondIframe = () => {
			setIsSecondIframeOpen((prevState) => !prevState);
		};

		SocketService.on("secondIframeToggled", toggleSecondIframe);

		return () => {
			SocketService.off("secondIframeToggled", toggleSecondIframe);
		};
	}, [isSecondIframeOpen]);

	return (
		<>
			<Head>
				<title>Collaborative Atlas</title>
			</Head>
			<main id='__app' className="flex-container">
				<div className="flex-child">
					<CollabIframe iframeIndex={1}
						iframeUrl={'http://52.87.229.169:3000/explore/small-business-support#map=5.29/-32.197/135'} />
				</div>
				{isSecondIframeOpen &&
					<div className="flex-child">
						<CollabIframe iframeIndex={2}
							iframeUrl={'http://52.87.229.169:3000/explore/small-business-support#map=5.29/-32.197/135'} />
					</div>}
					<Button onClick={buttonHandler} variant='outlined' sx={{
						position: 'absolute', bottom: 0, left: 0, margin: 'auto', color: '#ff9933', borderColor: 'orange',
						'&:hover': {
							borderColor: '#ffcb54',
							
						}
					}}>
					{isSecondIframeOpen ? 'Close' : 'Open'} Second Atlas</Button>
			</main>
		</>
	);
}

export default Home;
