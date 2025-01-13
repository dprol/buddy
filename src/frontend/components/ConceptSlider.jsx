import React, { useState } from 'react';

const ConceptSlider = () => {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Función para parsear los conceptos del texto de entrada
  const parseConceptsFromText = (text) => {
    return text.split('\n')
      .filter(line => line.trim())
      .map(line => {
        const [title, ...explanationParts] = line.split(':');
        return {
          title: title.trim(),
          explanation: explanationParts.join(':').trim()
        };
      })
      .filter(concept => concept.title && concept.explanation);
  };

  // Obtener el elemento que contiene el texto de los conceptos
  const conceptsTextElement = document.getElementById('concepts-data');
  const rawText = conceptsTextElement ? conceptsTextElement.getAttribute('data-concepts') : '';
  const concepts = parseConceptsFromText(rawText);

  const goToPrevious = () => {
    setCurrentIndex(current => 
      current === 0 ? concepts.length - 1 : current - 1
    );
  };

  const goToNext = () => {
    setCurrentIndex(current => 
      current === concepts.length - 1 ? 0 : current + 1
    );
  };

  if (!concepts || concepts.length === 0) {
    return <div className="p-4">No hay conceptos para mostrar</div>;
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-6 mb-4">
        <div className="min-h-[200px]">
          <h3 className="text-lg font-bold mb-2">{concepts[currentIndex].title}</h3>
          <p className="text-gray-700">{concepts[currentIndex].explanation}</p>
        </div>
        <div className="flex justify-between mt-4">
          <button 
            onClick={goToPrevious}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            ← Anterior
          </button>
          <span className="self-center">
            {currentIndex + 1} de {concepts.length}
          </span>
          <button 
            onClick={goToNext}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Siguiente →
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConceptSlider;