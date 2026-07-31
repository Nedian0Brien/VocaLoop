export const makeValidGeneratedQuestion = () => ({
  paragraph: [
    'Painting techniques changed gradually across many societies as artists discovered materials that could preserve color on stone, wood, and cloth.',
    'Early painters {{1}} natural {{2}} {{3}} cave walls, {{4}} simple shapes and detailed figures that recorded animals, rituals, and seasonal events.',
    'Methods {{5}} more flexible {{6}} prepared {{7}} spread, {{8}} artists to work {{9}} softer light, deeper shadows, {{10}} more lifelike portraits.',
    'Later movements valued personal expression, so painters often favored vivid contrasts and visible brushwork over exact representation of the natural world.',
  ].join(' '),
  fullParagraph: [
    'Painting techniques changed gradually across many societies as artists discovered materials that could preserve color on stone, wood, and cloth.',
    'Early painters used natural pigments on cave walls, creating simple shapes and detailed figures that recorded animals, rituals, and seasonal events.',
    'Methods became more flexible as prepared canvas spread, allowing artists to work with softer light, deeper shadows, and more lifelike portraits.',
    'Later movements valued personal expression, so painters often favored vivid contrasts and visible brushwork over exact representation of the natural world.',
  ].join(' '),
  blanks: [
    { id: 1, answer: 'used', revealCount: 2 },
    { id: 2, answer: 'pigments', revealCount: 3 },
    { id: 3, answer: 'on', revealCount: 1 },
    { id: 4, answer: 'creating', revealCount: 4 },
    { id: 5, answer: 'became', revealCount: 3 },
    { id: 6, answer: 'as', revealCount: 1 },
    { id: 7, answer: 'canvas', revealCount: 3 },
    { id: 8, answer: 'allowing', revealCount: 2 },
    { id: 9, answer: 'with', revealCount: 2 },
    { id: 10, answer: 'and', revealCount: 1 },
  ],
});
