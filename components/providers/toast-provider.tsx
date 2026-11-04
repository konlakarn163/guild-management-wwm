"use client";

import { useEffect, useState } from "react";
import { ToastContainer } from "react-toastify";
import { CatFace } from "@/components/public/cat-decor";

export function ToastProvider() {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return null;
    }

    return (
        <ToastContainer
            position="top-center"
            autoClose={2800}
            hideProgressBar={false}
            newestOnTop
            closeOnClick
            pauseOnHover
            draggable
            theme="dark"
            toastClassName="cat-toast"
            icon={({ type }) => <CatFace mood={type} className="h-7 w-7" />}
        />
    );
}