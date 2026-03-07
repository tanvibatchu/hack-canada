// semanticData.ts — Semantic Feature Analysis (SFA) data for Sound Hunt exercise.
// SFA is a gold-standard aphasia word retrieval technique (Boyle & Coelho, 1995).
// Each word has features: category, function, physical attribute, location, association.
// The "hint" button in Sound Hunt reveals one feature at a time (cueing hierarchy).

export type SemanticFeatures = {
    category: string;    // "It's an animal"
    function: string;    // "You can ride it"
    attribute: string;   // "It has fur and four legs"
    location: string;    // "You find it on a farm"
    association: string; // "It goes with a saddle"
};

export const semanticData: Record<string, SemanticFeatures> = {
    // R words
    rabbit: { category: "It's an animal", function: "It hops and eats carrots", attribute: "It's fluffy with long ears", location: "You find it in fields or as a pet", association: "It goes with Easter" },
    rainbow: { category: "It's weather and light", function: "It appears after rain", attribute: "It has seven colours", location: "You see it in the sky", association: "It goes with rain and sunshine" },
    carrot: { category: "It's a vegetable", function: "You eat it for nutrition", attribute: "It's long, orange, and crunchy", location: "You find it in gardens and stores", association: "It goes with rabbits" },
    parrot: { category: "It's a bird", function: "It can copy your words", attribute: "It's colourful with a hooked beak", location: "You find it in tropical places", association: "It goes with pirates" },
    star: { category: "It's a space object", function: "It shines in the night sky", attribute: "It's bright and has five points", location: "You see it far away in space", association: "It goes with night and wishes" },
    bear: { category: "It's an animal", function: "It sleeps all winter", attribute: "It's big, furry, and has claws", location: "You find it in forests", association: "It goes with honey" },
    rocket: { category: "It's a vehicle", function: "It flies to space", attribute: "It's tall, fast, and has fire at the bottom", location: "You find it at a launch pad", association: "It goes with astronauts" },
    berry: { category: "It's a fruit", function: "You eat it — it tastes sweet or tart", attribute: "It's small, round, and colourful", location: "You find it on bushes", association: "It goes with smoothies" },
    // S words
    sun: { category: "It's a star", function: "It gives us light and warmth", attribute: "It's very bright and yellow", location: "You see it in the sky during the day", association: "It goes with summer and sunscreen" },
    sock: { category: "It's clothing", function: "You wear it on your foot", attribute: "It's soft and comes in pairs", location: "You find it in a drawer", association: "It goes with shoes" },
    pencil: { category: "It's a school tool", function: "You use it to write and draw", attribute: "It's long, thin, and has a pointed tip", location: "You find it in a pencil case", association: "It goes with paper and erasing" },
    basket: { category: "It's a container", function: "You use it to carry things", attribute: "It's usually woven with a handle", location: "You find it in kitchens and picnics", association: "It goes with fruits and laundry" },
    bus: { category: "It's a vehicle", function: "It takes many people from place to place", attribute: "It's big, long, and yellow or red", location: "You find it on roads and bus stops", association: "It goes with school and routes" },
    grass: { category: "It's a plant", function: "It covers the ground in parks", attribute: "It's green, thin, and soft", location: "You find it in lawns and fields", association: "It goes with lawnmowers and picnics" },
    soap: { category: "It's a cleaning product", function: "You use it to wash and clean", attribute: "It's slippery and makes bubbles", location: "You find it in a bathroom or kitchen", association: "It goes with water and washing hands" },
    mouse: { category: "It's an animal", function: "It scurries around and finds food", attribute: "It's tiny with a long tail and big ears", location: "You find it in fields or houses", association: "It goes with cheese" },
    // TH words
    thumb: { category: "It's body part", function: "You use it to grip and give a thumbs up", attribute: "It's the shortest, widest finger", location: "It's on your hand", association: "It goes with four other fingers" },
    three: { category: "It's a number", function: "You use it to count", attribute: "It comes after two and before four", location: "You find it on number lines and clocks", association: "It goes with three bears or three pigs" },
    feather: { category: "It's from a bird", function: "It helps birds fly and stay warm", attribute: "It's light, soft, and tickles", location: "You find it in bird nests and pillows", association: "It goes with birds and writing quills" },
    bath: { category: "It's a cleaning activity", function: "You use it to get clean", attribute: "It's warm, full of water and bubbles", location: "You find it in a bathroom", association: "It goes with rubber ducks and soap" },
    teeth: { category: "It's body part", function: "You use them to bite and chew food", attribute: "They're white, hard, and in your mouth", location: "They're inside your mouth", association: "It goes with brushing and toothpaste" },
    mouth: { category: "It's body part", function: "You use it to talk, eat, and smile", attribute: "It has lips, teeth, and a tongue", location: "It's on your face below your nose", association: "It goes with speaking and eating" },
    thunder: { category: "It's weather", function: "It makes a very loud sound in storms", attribute: "It's loud, rumbling, and scary", location: "You hear it in the sky during thunderstorms", association: "It goes with lightning" },
    // L words
    lion: { category: "It's an animal", function: "It hunts and protects its pride", attribute: "It's big, golden, with a mane", location: "You find it in African savannahs", association: "It goes with tigers and bears" },
    lemon: { category: "It's a fruit", function: "You add it to drinks to make them sour", attribute: "It's yellow, oval, and very sour", location: "You find it in grocery stores", association: "It goes with lemonade" },
    balloon: { category: "It's a decoration", function: "It floats in the air to celebrate", attribute: "It's colourful, round, and full of air or helium", location: "You find it at parties", association: "It goes with birthdays" },
    jelly: { category: "It's a food", function: "You spread it on bread for a snack", attribute: "It's wobbly, sweet, and colourful", location: "You find it in fridges and jars", association: "It goes with peanut butter" },
    ball: { category: "It's a toy", function: "You throw, kick, or bounce it when playing", attribute: "It's round and comes in many sizes", location: "You find it at playgrounds", association: "It goes with games and sports" },
    bell: { category: "It's an instrument", function: "You ring it to make a sound or signal", attribute: "It's metal, round, and makes a ding", location: "You find it in schools and churches", association: "It goes with Christmas and doorbells" },
    leaf: { category: "It's part of a plant", function: "It makes food for the tree using sunlight", attribute: "It's flat, green, and has veins", location: "You find it on trees and bushes", association: "It goes with autumn colours" },
    owl: { category: "It's a bird", function: "It hunts mice at night", attribute: "It has big eyes, feathers, and hoots", location: "You find it in trees at night", association: "It goes with wisdom and Halloween" },
};
