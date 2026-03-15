/**
 * Student photo display page that fetches and renders a student's profile photo
 * based on college and filename URL parameters.
 */
import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';

const StudentPhoto = () => {
    const { college, filename } = useParams();
    const rollNumber = (filename || '').replace(/\.jpg$/i, '').toUpperCase();
    const collegePath = (college || '').toUpperCase();
    const [loaded, setLoaded] = useState(false);
    const [error, setError] = useState(false);

    const collegeFullName = {
        ACOE: 'Aditya College of Engineering',
        ACET: 'Aditya College of Engineering & Technology',
        AEC: 'Aditya Engineering College',
    }[collegePath] || collegePath;

    useEffect(() => {
        document.title = rollNumber;
    }, [rollNumber]);

    return (
        <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '100vh',
            background: 'var(--gradient-primary-full)',
            fontFamily: 'var(--font-family)',
            padding: '20px 16px',
            boxSizing: 'border-box',
        }}>
            <div style={{
                background: 'var(--color-bg-paper)',
                backdropFilter: 'blur(20px)',
                borderRadius: 24,
                padding: 'clamp(20px, 5vw, 32px)',
                boxShadow: 'var(--shadow-dialog)',
                border: '1px solid var(--color-border)',
                maxWidth: 420,
                width: '100%',
                textAlign: 'center',
                animation: 'fadeIn 0.6s ease-out',
            }}>
                {/* College Badge */}
                <div style={{
                    display: 'inline-block',
                    background: 'var(--gradient-primary)',
                    color: 'var(--color-text-white)',
                    fontSize: 12,
                    fontWeight: 700,
                    letterSpacing: 1.5,
                    padding: '6px 16px',
                    borderRadius: 20,
                    marginBottom: 24,
                    textTransform: 'uppercase',
                }}>
                    {collegePath}
                </div>

                {/* Photo Container */}
                <div style={{
                    position: 'relative',
                    width: '100%',
                    maxWidth: 'min(320px, 100%)',
                    aspectRatio: '1 / 1',
                    margin: '0 auto 24px',
                    borderRadius: '50%',
                    background: 'var(--gradient-primary-full)',
                    padding: 4,
                    boxShadow: 'var(--shadow-primary-glow)',
                    boxSizing: 'border-box',
                }}>
                    <div style={{
                        width: '100%',
                        height: '100%',
                        borderRadius: '50%',
                        overflow: 'hidden',
                        background: 'var(--color-bg)',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                    }}>
                        {!error ? (
                            <img
                                src={`/${collegePath}/StudentPhotos/${rollNumber}.jpg`}
                                alt={rollNumber}
                                onLoad={() => setLoaded(true)}
                                onError={() => setError(true)}
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover',
                                    objectPosition: 'top center',
                                    opacity: loaded ? 1 : 0,
                                    transition: 'opacity 0.5s ease',
                                }}
                            />
                        ) : (
                            <div style={{
                                color: 'var(--color-primary-alpha-30)',
                                fontSize: 48,
                                fontWeight: 700,
                            }}>
                                {rollNumber.slice(0, 2)}
                            </div>
                        )}
                    </div>
                </div>

                {/* Roll Number */}
                <h1 style={{
                    color: 'var(--color-text-primary)',
                    fontSize: 'clamp(22px, 5vw, 28px)',
                    fontWeight: 800,
                    margin: '0 0 8px',
                    letterSpacing: 2,
                    wordBreak: 'break-word',
                }}>
                    {rollNumber}
                </h1>

                {/* College Name */}
                <p style={{
                    color: 'var(--color-text-secondary)',
                    fontSize: 'clamp(12px, 3vw, 13px)',
                    margin: 0,
                    fontWeight: 500,
                    letterSpacing: 0.5,
                }}>
                    {collegeFullName}
                </p>

                {/* Decorative line */}
                <div style={{
                    width: 60,
                    height: 3,
                    background: 'var(--gradient-primary)',
                    borderRadius: 2,
                    margin: '20px auto 0',
                }} />
            </div>

            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(20px) scale(0.95); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
            `}</style>
        </div>
    );
};

export default StudentPhoto;
