/**
 * Main app navigation with auth flow
 */
import { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { supabase } from '../lib/supabase';
import { Session } from '@supabase/supabase-js';
import HomeScreen from '../screens/HomeScreen';
import AuthScreen from '../features/auth/AuthScreen';
import ProfileScreen from '../features/profile/ProfileScreen';
import EditProfileScreen from '../features/profile/EditProfileScreen';
import PreferencesScreen from '../features/preferences/PreferencesScreen';
import PersonDetailScreen from '../features/person/PersonDetailScreen';
import MatchesScreen from '../features/match/MatchesScreen';
import NotificationsScreen from '../features/notifications/NotificationsScreen';

type RootStackParamList = {
    Auth: undefined;
    Home: undefined;
    Profile: undefined;
    EditProfile: undefined;
    Preferences: undefined;
    PersonDetail: { userId: string };
    Matches: undefined;
    Notifications: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setLoading(false);
        });

        // Listen for auth changes
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
        });

        return () => subscription.unsubscribe();
    }, []);

    if (loading) {
        return null; // TODO: Add splash screen
    }

    return (
        <NavigationContainer>
            <Stack.Navigator
                screenOptions={{
                    headerShown: false,
                }}
            >
                {!session ? (
                    <Stack.Screen name="Auth" component={AuthScreen} />
                ) : (
                    <>
                        <Stack.Screen name="Home" component={HomeScreen} />
                        
                        <Stack.Screen
                            name="Profile"
                            component={ProfileScreen}
                            options={{ headerShown: true, title: 'Profile' }}
                        />

                        <Stack.Screen
                            name="EditProfile"
                            component={EditProfileScreen}
                            options={{
                                headerShown: true,
                                title: 'Edit Profile',
                            }}
                        />
                        <Stack.Screen
                            name="Preferences"
                            component={PreferencesScreen}
                            options={{
                                headerShown: true,
                                title: 'Preferences',
                            }}
                        />
                        <Stack.Screen
                            name="PersonDetail"
                            component={PersonDetailScreen}
                            options={{
                                headerShown: true,
                                title: 'User Profile',
                            }}
                        />
                        <Stack.Screen
                            name="Matches"
                            component={MatchesScreen}
                            options={{ headerShown: true, title: 'Matches' }}
                        />
                        <Stack.Screen
                            name="Notifications"
                            component={NotificationsScreen}
                        />
                    </>
                )}
            </Stack.Navigator>
        </NavigationContainer>
    );
}
