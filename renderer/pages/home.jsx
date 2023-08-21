import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import dynamic from 'next/dynamic';
import { SocketService } from "../services/socketService"
import Button from '@mui/material/Button';
import Drawer from '@mui/material/Drawer';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';

const CollabIframe = dynamic(() => {
    return import('../components/CollabIframe')
}, { ssr: false })

function Home() {
    const [isSecondIframeOpen, setIsSecondIframeOpen] = useState(false);
    const [isFormOpen, setIsFormOpen] = useState(false);
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
            <AppBar position="fixed" sx={{ marginRight: isFormOpen ? '500px' : '0px', backgroundColor: 'black' }}>
                <Toolbar>
                    <Typography variant="h6" sx={{ flexGrow: 1, marginLeft: isFormOpen? '500px': '0px' }}>
                        Collaborative Atlas
                    </Typography>

                    {/*<Button onClick={buttonHandler} variant='contained' sx={{
                        marginRight: 1,
                        '&:hover': {
                            backgroundColor: '#ff6611'
                        },
                        ...(isSecondIframeOpen ? { backgroundColor: 'darkgoldenrod' } : { backgroundColor: 'chocolate' })
                    }}>
                        {isSecondIframeOpen ? 'Close' : 'Open'} Second Atlas
                    </Button>*/}

                    <Button onClick={() => setIsFormOpen(!isFormOpen)} variant='contained' sx={{
                        marginRight: 1,
                        backgroundColor: '#313332',
                        '&:hover': {
                            backgroundColor: '#4f504f'
                        },
                    }}>
                        {isFormOpen ? 'Close' : 'Open'} Form
                    </Button>
                </Toolbar>
            </AppBar>

            <main id='__app' className="flex-container" style={{ marginTop: 64, height: 'calc(100vh - 64px)', overflowY: 'hidden' }}>
                <div className="flex-child">
                    <CollabIframe iframeIndex={1}
                        iframeUrl={'http://13.38.16.241:3000/explore/small-business-support#map=5.28/-32.197/135'} />
                </div>
                {isSecondIframeOpen &&
                    <div className="flex-child">
                        <CollabIframe iframeIndex={2}
                            iframeUrl={'http://13.38.16.241:3000/explore/small-business-support#map=5.28/-32.197/135'} />
                    </div>}

                <Drawer anchor="right" variant="persistent" open={isFormOpen} onClose={() => setIsFormOpen(false)}>
                    <div style={{ width: 500, height: '100%' }}>
                        <iframe src="https://docs.google.com/forms/d/e/1FAIpQLSc73XsShMZI9fk940h0laGkBSrvp75W29JNCRwtYGQ16fl8Kg/viewform?embedded=true"
                            width="640" height="2129">Loading…</iframe>
                    </div>
                </Drawer>
            </main>
        </>
    );
}

export default Home;
