import React, { useState, useEffect } from "react";
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, Image, StyleSheet, Button } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";

// Define the Stack Navigator
const Stack = createStackNavigator();

// ------------------
// Launch List Screen
// ------------------
const LaunchListScreen = ({ navigation }) => {
  const [launches, setLaunches] = useState([]);
  const [rockets, setRockets] = useState({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All"); // Options: All, Past, Upcoming

  // Fetch launches and rockets
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch launches
        const launchResponse = await fetch("https://api.spacexdata.com/v4/launches");
        const launchData = await launchResponse.json();
        // Sort launches by date
        launchData.sort((a, b) => new Date(b.date_utc) - new Date(a.date_utc));

        // Fetch rockets
        const rocketResponse = await fetch("https://api.spacexdata.com/v4/rockets");
        const rocketData = await rocketResponse.json();
        // Create a mapping: rocket id -> rocket name
        const rocketMap = {};
        rocketData.forEach((rocket) => {
          rocketMap[rocket.id] = rocket.name;
        });

        setLaunches(launchData);
        setRockets(rocketMap);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching data: ", error);
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Apply filtering based on launch date
  const filteredLaunches = launches.filter((launch) => {
    if (filter === "Past") {
      return new Date(launch.date_utc) < new Date();
    } else if (filter === "Upcoming") {
      return new Date(launch.date_utc) >= new Date();
    }
    return true;
  });

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  const renderItem = ({ item }) => {
    const launchDate = new Date(item.date_utc).toLocaleDateString();
    const rocketName = rockets[item.rocket] || "Unknown Rocket";
    const successStatus = item.success === null ? "N/A" : item.success ? "Success" : "Failed";

    return (
      <TouchableOpacity
        style={styles.itemContainer}
        onPress={() => navigation.navigate("LaunchDetail", { launch: item })}
      >
        <Text style={styles.itemTitle}>{item.name}</Text>
        <Text>Date: {launchDate}</Text>
        <Text>Rocket: {rocketName}</Text>
        <Text>Status: {successStatus}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Filter Buttons */}
      <View style={styles.filterContainer}>
        <Button title="All" onPress={() => setFilter("All")} />
        <Button title="Past" onPress={() => setFilter("Past")} />
        <Button title="Upcoming" onPress={() => setFilter("Upcoming")} />
      </View>

      <FlatList
        data={filteredLaunches}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
      />
    </View>
  );
};

// ----------------------
// Launch Detail Screen
// ----------------------
const LaunchDetailScreen = ({ route }) => {
  const { launch } = route.params;
  const [rocket, setRocket] = useState(null);
  const [payloads, setPayloads] = useState([]);
  const [launchpad, setLaunchpad] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        // Fetch rocket details
        const rocketResponse = await fetch(`https://api.spacexdata.com/v4/rockets/${launch.rocket}`);
        const rocketData = await rocketResponse.json();
        setRocket(rocketData);

        // Fetch payload details (using Promise.all)
        const payloadPromises = launch.payloads.map((id) =>
          fetch(`https://api.spacexdata.com/v4/payloads/${id}`).then((res) => res.json())
        );
        const payloadData = await Promise.all(payloadPromises);
        setPayloads(payloadData);

        // Fetch launchpad details
        const launchpadResponse = await fetch(`https://api.spacexdata.com/v4/launchpads/${launch.launchpad}`);
        const launchpadData = await launchpadResponse.json();
        setLaunchpad(launchpadData);

        setLoading(false);
      } catch (error) {
        console.error("Error fetching launch details: ", error);
        setLoading(false);
      }
    };
    fetchDetails();
  }, [launch]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  const launchDate = new Date(launch.date_utc).toLocaleString();
  const successStatus = launch.success === null ? "N/A" : launch.success ? "Success" : "Failed";
  const missionPatch = launch.links?.patch?.small;

  return (
    <View style={styles.container}>
      <Text style={styles.itemTitle}>{launch.name}</Text>
      <Text>Date: {launchDate}</Text>
      <Text>Status: {successStatus}</Text>
      {rocket && <Text>Rocket: {rocket.name}</Text>}
      {launchpad && <Text>Launch Site: {launchpad.name}</Text>}
      {missionPatch ? (
        <Image source={{ uri: missionPatch }} style={styles.patchImage} />
      ) : (
        <Text>No Mission Patch</Text>
      )}
      <Text style={{ marginTop: 10, fontWeight: "bold" }}>Payloads:</Text>
      {payloads.map((payload) => (
        <View key={payload.id} style={styles.payloadContainer}>
          <Text>ID: {payload.id}</Text>
          {payload.name && <Text>Name: {payload.name}</Text>}
          {payload.type && <Text>Type: {payload.type}</Text>}
        </View>
      ))}
    </View>
  );
};

// ----------------------
// App Entry Point
// ----------------------
export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="LaunchList">
        <Stack.Screen name="LaunchList" component={LaunchListScreen} options={{ title: "SpaceX Launches" }} />
        <Stack.Screen name="LaunchDetail" component={LaunchDetailScreen} options={{ title: "Launch Details" }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

// ----------------------
// Basic Styles
// ----------------------
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
    backgroundColor: "#fff",
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  itemContainer: {
    padding: 15,
    borderWidth: 1,
    borderColor: "#ddd",
    marginBottom: 10,
    borderRadius: 5,
  },
  itemTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  patchImage: {
    width: 100,
    height: 100,
    resizeMode: "contain",
    marginVertical: 10,
  },
  filterContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 10,
  },
  payloadContainer: {
    padding: 5,
    borderWidth: 1,
    borderColor: "#ccc",
    marginVertical: 5,
    borderRadius: 3,
  },
});