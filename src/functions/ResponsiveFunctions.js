import { useEffect, useState } from "react";

export default function useMobile() {
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const media = window.matchMedia(
            "(max-width:768px) and (hover:none) and (pointer:coarse)"
        );

        const update = () => setIsMobile(media.matches);

        update();

        media.addEventListener("change", update);

        return () => media.removeEventListener("change", update);
    }, []);

    return isMobile;
}