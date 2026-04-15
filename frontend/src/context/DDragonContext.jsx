import React, { createContext, useContext, useState, useEffect } from 'react';
import { fetchDDragon } from '../utils/fetchDDragon';

const DDragonContext = createContext();

export function DDragonProvider({ children }) {
    const [latestVersion, setLatestVersion] = useState("14.3.1");

    useEffect(() => {
        const getVersion = async () => {
            try {
                const data = await fetchDDragon();
                if (data && data.latestVersion) {
                    setLatestVersion(data.latestVersion);
                }
            } catch (error) {
                console.error("Error fetching latest DDragon version:", error);
            }
        };
        getVersion();
    }, []);

    return (
        <DDragonContext.Provider value={{ latestVersion }}>
            {children}
        </DDragonContext.Provider>
    );
}

export function useDDragon() {
    return useContext(DDragonContext);
}
