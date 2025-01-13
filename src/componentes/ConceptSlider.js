const React = require('react');
const { useState } = React;

const ConceptSlider = ({ concepts }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [touchStart, setTouchStart] = useState(0);

    const nextSlide = () => {
        setCurrentIndex((prevIndex) =>
            prevIndex === concepts.length - 1 ? 0 : prevIndex + 1
        );
    };

    const prevSlide = () => {
        setCurrentIndex((prevIndex) =>
            prevIndex === 0 ? concepts.length - 1 : prevIndex - 1
        );
    };

    const handleTouchStart = (e) => {
        setTouchStart(e.touches[0].clientX);
    };

    const handleTouchEnd = (e) => {
        const touchEnd = e.changedTouches[0].clientX;
        const difference = touchStart - touchEnd;
        const threshold = 50;
        if (Math.abs(difference) > threshold) {
            if (difference > 0) {
                nextSlide();
            } else {
                prevSlide();
            }
        }
    };

    return React.createElement('div', {
        className: "relative w-full mx-auto px-8 py-4" // Ajustado el padding horizontal
    }, [
        React.createElement('div', {
            key: 'slider-container',
            className: "overflow-hidden rounded-lg bg-white shadow-lg mx-8", // Añadido margen horizontal
            onTouchStart: handleTouchStart,
            onTouchEnd: handleTouchEnd
        }, [
            React.createElement('div', {
                key: 'slider',
                className: "flex transition-transform duration-300 ease-in-out",
                style: { transform: `translateX(-${currentIndex * 100}%)` }
            }, concepts.map((concept, index) =>
                React.createElement('div', {
                    key: index,
                    className: "flex-shrink-0 w-full p-8" // Aumentado el padding
                }, [
                    React.createElement('div', {
                        key: 'card',
                        className: "bg-red-50 rounded-lg p-6 min-h-[200px] flex flex-col" // Añadido flex-col
                    }, [
                        React.createElement('h3', {
                            key: 'title',
                            className: "text-xl font-bold text-red-600 mb-4"
                        }, concept.mainConcept || 'Concepto'),
                        React.createElement('p', {
                            key: 'explanation',
                            className: "text-gray-700 flex-grow" // Añadido flex-grow
                        }, concept.explanation || 'Explicación')
                    ])
                ])
            ))
        ]),
        React.createElement('div', {
            key: 'prev-button',
            className: "absolute inset-y-0 left-0 flex items-center px-2" // Añadido padding horizontal
        },
            React.createElement('button', {
                onClick: prevSlide,
                className: "p-3 rounded-full bg-red-600 text-white shadow-lg hover:bg-red-700 focus:outline-none",
                'aria-label': "Anterior"
            }, "←")
        ),
        React.createElement('div', {
            key: 'next-button',
            className: "absolute inset-y-0 right-0 flex items-center px-2" // Añadido padding horizontal
        },
            React.createElement('button', {
                onClick: nextSlide,
                className: "p-3 rounded-full bg-red-600 text-white shadow-lg hover:bg-red-700 focus:outline-none",
                'aria-label': "Siguiente"
            }, "→")
        ),
        React.createElement('div', {
            key: 'indicators',
            className: "flex justify-center mt-4 gap-2"
        }, concepts.map((_, index) =>
            React.createElement('button', {
                key: index,
                onClick: () => setCurrentIndex(index),
                className: `w-2 h-2 rounded-full transition-colors ${
                    index === currentIndex ? 'bg-red-600' : 'bg-gray-300'
                }`,
                'aria-label': `Ir a concepto ${index + 1}`
            })
        ))
    ]);
};

module.exports = ConceptSlider;