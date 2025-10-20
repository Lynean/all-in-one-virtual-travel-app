# Places API - Advanced Features Guide

## Overview
The Places branch now supports **70+ place fields** and **150+ place types** from Google's Places API (New). This enables highly sophisticated place searches with dietary restrictions, amenities, atmosphere, accessibility, and more.

## 📚 Table of Contents
- [Place Types](#place-types)
- [Place Fields](#place-fields)
- [Query Examples](#query-examples)
- [Filter Categories](#filter-categories)
- [Best Practices](#best-practices)

---

## 🏷️ Place Types

### Automotive
```
car_dealer, car_rental, car_repair, car_wash, 
electric_vehicle_charging_station, gas_station, parking, rest_stop
```

### Business & Professional
```
corporate_office, farm, ranch
```

### Culture & Arts
```
art_gallery, art_studio, auditorium, cultural_landmark, historical_place, 
monument, museum, performing_arts_theater, sculpture
```

### Education
```
library, preschool, primary_school, school, secondary_school, university
```

### Entertainment & Recreation
```
amusement_center, amusement_park, aquarium, bowling_alley, casino, 
movie_theater, night_club, zoo, water_park, theme_park, arcade
```

### Sports & Fitness
```
gym, fitness_center, sports_club, stadium, swimming_pool, yoga_studio, 
golf_course, ski_resort, playground, skating_rink
```

### Food & Drink (150+ specific types!)
```
# Main Categories
restaurant, cafe, bar, bakery, fast_food_restaurant

# Cuisine-Specific
italian_restaurant, chinese_restaurant, japanese_restaurant, 
mexican_restaurant, indian_restaurant, thai_restaurant, vietnamese_restaurant,
french_restaurant, greek_restaurant, korean_restaurant, spanish_restaurant,
middle_eastern_restaurant, brazilian_restaurant, turkish_restaurant

# Specialized Food Places
vegetarian_restaurant, vegan_restaurant, seafood_restaurant, steak_house,
sushi_restaurant, ramen_restaurant, pizza_restaurant, hamburger_restaurant,
sandwich_shop, dessert_shop, ice_cream_shop, donut_shop, juice_shop

# Dining Types
fine_dining_restaurant, brunch_restaurant, breakfast_restaurant, 
buffet_restaurant, bar_and_grill, pub, wine_bar, coffee_shop, tea_house

# Food Services
meal_delivery, meal_takeaway, food_court
```

### Lodging
```
hotel, motel, resort_hotel, extended_stay_hotel, bed_and_breakfast, 
hostel, inn, campground, rv_park, guest_house
```

### Health & Wellness
```
hospital, pharmacy, doctor, dentist, physiotherapist, spa, sauna, 
massage, beauty_salon, hair_salon, nail_salon, gym, yoga_studio,
wellness_center
```

### Shopping
```
shopping_mall, supermarket, grocery_store, convenience_store, 
department_store, clothing_store, electronics_store, book_store,
furniture_store, jewelry_store, pet_store, liquor_store
```

### Services
```
bank, atm, post_office, police, fire_station, laundry, dry_cleaning,
hair_salon, beauty_salon, florist, locksmith, plumber, electrician
```

### Transportation
```
airport, train_station, subway_station, bus_station, ferry_terminal,
taxi_stand, park_and_ride
```

### Religious
```
church, mosque, hindu_temple, synagogue
```

### Nature & Outdoors
```
park, national_park, state_park, botanical_garden, beach, hiking_area,
dog_park, campground, marina
```

---

## 🔍 Place Fields

### Basic Information (Always Available)
- `id` - Place ID
- `displayName` - Place name
- `formattedAddress` - Full address
- `location` - Latitude/longitude
- `types` - Place type categories
- `googleMapsUri` - Link to Google Maps

### Business Details
- `businessStatus` - OPERATIONAL, CLOSED_TEMPORARILY, CLOSED_PERMANENTLY
- `priceLevel` - INEXPENSIVE, MODERATE, EXPENSIVE, VERY_EXPENSIVE
- `rating` - Average rating (1.0-5.0)
- `userRatingCount` - Number of reviews
- `websiteUri` - Official website

### Opening Hours
- `currentOpeningHours` - Current schedule
- `regularOpeningHours` - Normal schedule
- `openNow` - Currently open (boolean)

### Dietary & Food Service
- `servesBreakfast` - Breakfast available
- `servesBrunch` - Brunch available
- `servesLunch` - Lunch available
- `servesDinner` - Dinner available
- `servesVegetarianFood` - Vegetarian options
- `servesBeer` - Beer available
- `servesWine` - Wine available
- `servesCocktails` - Cocktails available
- `servesCoffee` - Coffee available
- `servesDessert` - Dessert available

### Amenities & Features
- `takeout` - Takeout available
- `delivery` - Delivery available
- `dineIn` - Dine-in available
- `reservable` - Reservations accepted
- `curbsidePickup` - Curbside pickup
- `outdoorSeating` - Outdoor seating available
- `liveMusic` - Live music
- `restroom` - Public restroom
- `parking` - Parking available
- `wifi` - WiFi available (if supported)

### Accessibility & Atmosphere
- `accessibilityOptions` - Wheelchair accessible, etc.
- `goodForChildren` - Kid-friendly
- `goodForGroups` - Good for large groups
- `goodForWatchingSports` - Sports viewing
- `allowsDogs` - Pet-friendly
- `menuForChildren` - Kids menu available

### Advanced Features
- `photos` - Place photos
- `reviews` - User reviews
- `editorialSummary` - Editorial description
- `generativeSummary` - AI-generated summary (NEW!)
- `evChargeOptions` - EV charging stations

---

## 💡 Query Examples

### Simple Queries
```javascript
// Basic search
"Find restaurants near me"
→ { query: "restaurant", latitude: 1.29, longitude: 103.77, radius: 5000 }

// With price filter
"Cheap coffee shops"
→ { query: "coffee shop", priceLevel: "INEXPENSIVE", includedTypes: ["cafe", "coffee_shop"] }

// With rating
"Highly rated hotels"
→ { query: "hotel", minRating: 4.5, includedTypes: ["hotel"] }
```

### Dietary Restrictions
```javascript
// Vegetarian
"Vegetarian restaurants near Marina Bay"
→ { 
  query: "vegetarian restaurant", 
  servesVegetarianFood: true,
  includedTypes: ["vegetarian_restaurant", "restaurant"]
}

// Vegan options
"Vegan-friendly cafes"
→ { query: "vegan cafe", servesVegetarianFood: true, includedTypes: ["cafe"] }

// Breakfast
"Breakfast places open now"
→ { query: "breakfast restaurant", servesBreakfast: true, openNow: true }
```

### Atmosphere & Amenities
```javascript
// Kid-friendly
"Kid-friendly restaurants with parking"
→ { 
  query: "family restaurant",
  goodForChildren: true,
  parking: true,
  includedTypes: ["restaurant"]
}

// Pet-friendly
"Dog-friendly cafes with outdoor seating"
→ {
  query: "pet-friendly cafe",
  allowsDogs: true,
  outdoorSeating: true,
  includedTypes: ["cafe"]
}

// Groups
"Restaurants good for large groups"
→ { query: "restaurant", goodForGroups: true }

// Live entertainment
"Bars with live music"
→ { query: "bar", liveMusic: true, includedTypes: ["bar", "night_club"] }
```

### Service Types
```javascript
// Delivery
"Pizza places with delivery"
→ { query: "pizza", delivery: true, includedTypes: ["pizza_restaurant"] }

// Takeout
"Asian restaurants with takeout"
→ { query: "asian restaurant", takeout: true, includedTypes: ["asian_restaurant"] }

// Reservations
"Fine dining that accepts reservations"
→ { query: "fine dining", reservable: true, includedTypes: ["fine_dining_restaurant"] }
```

### Complex Multi-Filter
```javascript
// The Ultimate Query
"Cheap vegetarian restaurants with outdoor seating, good for kids, open now"
→ {
  query: "vegetarian restaurant",
  priceLevel: "INEXPENSIVE",
  servesVegetarianFood: true,
  outdoorSeating: true,
  goodForChildren: true,
  openNow: true,
  includedTypes: ["vegetarian_restaurant", "restaurant"]
}

// Sports bar
"Sports bars with parking and food"
→ {
  query: "sports bar",
  goodForWatchingSports: true,
  parking: true,
  dineIn: true,
  includedTypes: ["bar", "sports_bar"]
}

// Accessible dining
"Wheelchair accessible restaurants with valet parking"
→ {
  query: "accessible restaurant",
  accessibilityOptions: true,
  parking: true,
  includedTypes: ["restaurant"]
}
```

---

## 🎯 Filter Categories

### 1. **Price Filters**
```javascript
priceLevel: "INEXPENSIVE" | "MODERATE" | "EXPENSIVE" | "VERY_EXPENSIVE"
```
- INEXPENSIVE: Budget-friendly ($)
- MODERATE: Mid-range ($$)
- EXPENSIVE: Upscale ($$$)
- VERY_EXPENSIVE: Fine dining ($$$$)

### 2. **Rating Filters**
```javascript
minRating: 1.0 - 5.0  // Minimum average rating
```

### 3. **Operating Hours**
```javascript
openNow: true  // Only show places currently open
```

### 4. **Dietary & Cuisine**
```javascript
servesBreakfast: boolean
servesBrunch: boolean
servesLunch: boolean
servesDinner: boolean
servesVegetarianFood: boolean
servesBeer: boolean
servesWine: boolean
servesCocktails: boolean
servesCoffee: boolean
servesDessert: boolean
```

### 5. **Amenities**
```javascript
takeout: boolean
delivery: boolean
dineIn: boolean
reservable: boolean
curbsidePickup: boolean
outdoorSeating: boolean
liveMusic: boolean
restroom: boolean
parking: boolean
```

### 6. **Atmosphere**
```javascript
goodForChildren: boolean
goodForGroups: boolean
goodForWatchingSports: boolean
allowsDogs: boolean
menuForChildren: boolean
```

### 7. **Accessibility**
```javascript
accessibilityOptions: boolean  // Wheelchair accessible, etc.
```

---

## ✨ Best Practices

### 1. **Be Specific with Place Types**
```javascript
// ❌ Too generic
{ query: "food", includedTypes: ["restaurant"] }

// ✅ Specific
{ query: "italian restaurant", includedTypes: ["italian_restaurant"] }
```

### 2. **Combine Filters Logically**
```javascript
// ✅ Logical combination
{
  query: "family restaurant",
  goodForChildren: true,
  parking: true,
  priceLevel: "MODERATE"
}

// ❌ Contradictory
{
  query: "fine dining",
  priceLevel: "INEXPENSIVE"  // Unlikely combination
}
```

### 3. **Use Appropriate Radius**
```javascript
// Urban area - smaller radius
{ radius: 2000 }  // 2km for dense cities

// Suburban - medium radius
{ radius: 5000 }  // 5km for suburbs

// Rural - larger radius
{ radius: 20000 }  // 20km for rural areas
```

### 4. **Omit Unnecessary Fields**
Only include filters that are explicitly mentioned or strongly implied:
```javascript
// ❌ Too many assumptions
{
  query: "restaurant",
  goodForChildren: true,    // Not mentioned
  parking: true,            // Not mentioned
  outdoorSeating: true      // Not mentioned
}

// ✅ Only what's mentioned
{
  query: "restaurant",
  openNow: true  // User said "open now"
}
```

### 5. **Handle Ambiguous Queries**
```javascript
// "Cheap eats" → Could mean multiple things
{
  query: "restaurant",
  priceLevel: "INEXPENSIVE",
  includedTypes: ["restaurant", "fast_food_restaurant", "food_court"]
}

// "Coffee" → Be specific about type
{
  query: "coffee shop",
  servesCoffee: true,
  includedTypes: ["cafe", "coffee_shop"]
}
```

---

## 🚀 Advanced Use Cases

### 1. **Dietary Restrictions**
```javascript
// Vegan traveler
"Find vegan restaurants with outdoor seating"
→ {
  servesVegetarianFood: true,
  outdoorSeating: true,
  includedTypes: ["vegan_restaurant", "vegetarian_restaurant"]
}
```

### 2. **Family Travel**
```javascript
// Family with kids
"Kid-friendly restaurants with parking and bathrooms"
→ {
  goodForChildren: true,
  parking: true,
  restroom: true,
  menuForChildren: true
}
```

### 3. **Accessibility Needs**
```javascript
// Wheelchair user
"Wheelchair accessible cafes"
→ {
  accessibilityOptions: true,
  includedTypes: ["cafe"]
}
```

### 4. **Business Travel**
```javascript
// Business lunch
"Reservable restaurants good for groups"
→ {
  reservable: true,
  goodForGroups: true,
  priceLevel: "MODERATE"
}
```

### 5. **Late Night Options**
```javascript
// Night owl
"Restaurants open now with delivery"
→ {
  openNow: true,
  delivery: true,
  includedTypes: ["restaurant", "fast_food_restaurant"]
}
```

---

## 📊 Filter Priority

When multiple filters are specified, they work together as **AND conditions**:

```javascript
// All conditions must be met
{
  query: "restaurant",
  servesVegetarianFood: true,  // AND
  goodForChildren: true,        // AND
  parking: true,                // AND
  openNow: true                 // AND
}
```

**Result**: Only restaurants that are:
- Vegetarian-friendly AND
- Kid-friendly AND
- Have parking AND
- Currently open

---

## 🔗 Resources

- **Full Place Types List**: See `PlaceType.txt` (150+ types)
- **Full Place Fields List**: See `PlaceField.txt` (70+ fields)
- **Official Documentation**: https://developers.google.com/maps/documentation/places/web-service/data-fields
- **Place Types Reference**: https://developers.google.com/maps/documentation/places/web-service/place-types

---

## 🎓 Training the Agent

The agent now understands natural language queries and maps them to these fields:

| User Says | Agent Extracts |
|-----------|---------------|
| "vegetarian" | `servesVegetarianFood: true` |
| "kid-friendly" | `goodForChildren: true` |
| "pet-friendly" | `allowsDogs: true` |
| "outdoor seating" | `outdoorSeating: true` |
| "open now" | `openNow: true` |
| "cheap" | `priceLevel: "INEXPENSIVE"` |
| "expensive" | `priceLevel: "EXPENSIVE"` |
| "highly rated" | `minRating: 4.0` |
| "with parking" | `parking: true` |
| "delivery" | `delivery: true` |
| "takeout" | `takeout: true` |
| "reservations" | `reservable: true` |

---

## 🧪 Testing Advanced Queries

### Test Cases
```python
# Test 1: Dietary + Atmosphere
await agent.process_message(
    "Find vegetarian restaurants with outdoor seating",
    session_id="test"
)
# Expected: servesVegetarianFood=true, outdoorSeating=true

# Test 2: Family-friendly
await agent.process_message(
    "Kid-friendly cafes with parking",
    session_id="test"
)
# Expected: goodForChildren=true, parking=true

# Test 3: Price + Rating + Amenities
await agent.process_message(
    "Cheap breakfast places with takeout, rated above 4 stars",
    session_id="test"
)
# Expected: priceLevel=INEXPENSIVE, servesBreakfast=true, takeout=true, minRating=4.0

# Test 4: Complex multi-filter
await agent.process_message(
    "Pet-friendly restaurants with outdoor seating, good for groups, open now",
    session_id="test"
)
# Expected: allowsDogs=true, outdoorSeating=true, goodForGroups=true, openNow=true
```

---

## 📝 Notes

1. **Not all fields are available for all places**: Some fields are only available with premium tiers (Enterprise, Enterprise + Atmosphere)

2. **Field availability varies by place type**: For example, `servesBreakfast` only applies to restaurants/cafes

3. **Multiple types can be combined**: `includedTypes: ["cafe", "bakery"]` searches for both

4. **Price level is subjective**: Based on local market standards

5. **Rating is average**: Places with few reviews may have unreliable ratings

6. **openNow is real-time**: Reflects current operating status

7. **Boolean filters reduce results**: Each filter narrows the search - use judiciously

---

**Last Updated**: October 2025  
**Version**: 2.0 (Multi-Phase Architecture)
