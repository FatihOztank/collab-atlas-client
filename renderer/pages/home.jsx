import React from 'react';
import Head from 'next/head';
import dynamic from 'next/dynamic';

const CollabIframe = dynamic(() => {
	return import('../components/CollabIframe')
}, { ssr: false })

function Home() {
	return (
		<>
			<Head>
				<title>Collaborative Atlas</title>
			</Head>
			<main>
				<CollabIframe iframeIndex={1} />
				<CollabIframe iframeIndex={2} />

			</main>
		</>
	);
}

export default Home;
