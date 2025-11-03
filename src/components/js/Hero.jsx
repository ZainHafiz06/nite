import { useRef, useEffect } from 'react';
import Typed from 'typed.js';

import '../css/Hero.css'

export default function ()
{
    const tagline_h1 = useRef(null);
    const tagline_sub = "an app by Zain Hafiz";

    useEffect(() => {
        const typed = new Typed(tagline_h1.current, {
            strings: ['study smarter'],
            typeSpeed: 50
        });

        return () => {
            typed.destroy();
        }
    }, []);

    return (
        <>
            <img src=""/>

            <div className="tagline">
                <h1 ref={ tagline_h1 }></h1>
                <h2 ref={ tagline_sub }></h2>
            </div>
        </>
    );
}