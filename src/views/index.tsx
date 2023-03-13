import {
    AppBar,
    Box,
    Button,
    SvgIcon,
    Toolbar,
    Typography,
    Stack,
    Grid,
    Container,
} from "@mui/material"
import Terminal from "react-animated-term"
import useScrollTrigger from "@mui/material/useScrollTrigger"
import { ReactComponent as ArcaelaSVG } from "~/media/logo/512.svg"

function buffer(text: string, loadingText: string = "Processing...") {
    return {
        text, cmd: false, repeat: true, repeatCount: 2,
        frames: ["|", "/", "-", "\\",].map(frame => ({
            text: loadingText,
            delay: 80,
        }))
    }
}

function CommandLine() {
    return <Terminal lines={[
        { text: "arcaela create auth:event -n MyEvent -e onCreate", cmd: true, delay: 80 },
        buffer("✔ Done"),
        { text: "", cmd: true }
    ]} interval={40} height={160} />;
};


export default function View() {
    const trigger = useScrollTrigger({
        threshold: 10,
        disableHysteresis: true,
    })

    return <>
        <AppBar position="fixed" color="primary" variant="elevation" elevation={trigger ? 2 : 0}>
            <Toolbar variant={trigger ? "dense" : "regular"} style={{ alignItems: "center", justifyContent: "space-between", transition: "min-height 350ms ease" }}>
                <Stack direction="row" alignItems="flex-end">
                    <SvgIcon component={ArcaelaSVG} viewBox="0 0 512 430" sx={{ mr: 1 }} />
                    <Typography mr={2} lineHeight={1} variant="h6" noWrap>
                        Arcaelas Insiders
                    </Typography>
                </Stack>
                <Stack direction="row">
                    <Button color="primary" size="small" variant="text">consola</Button>
                </Stack>
            </Toolbar>
        </AppBar>
        <Box bgcolor="primary.main" color="primary.contrastText" mt={6}>
            <Container>
                <Grid container direction="row" alignItems="center" justifyContent="space-around" minHeight="calc(100vh - 48px)">
                    <Grid item xs={6}>
                        <Typography variant="h2" textTransform="uppercase" fontWeight="bold">UI/UX Design Services</Typography>
                        <Typography variant="body1" mt={2}>We create truly habit-forming products. With the sexy look and UX in mind. UI/UX design services result in 5 key components: Mind map + Wireframes + UI Concept + Figma design + Clickable prototype with UI kit. Scroll down to see the process in detail!</Typography>
                    </Grid>
                    <Grid item xs={6}>
                        <CommandLine />
                        {/* <Box maxWidth="100%" component="img" src="https://cdni.iconscout.com/illustration/premium/thumb/software-developer-1946892-1651592.png" /> */}
                    </Grid>
                </Grid>
            </Container>
        </Box>

        <Box minHeight="200vh" />
    </>
}