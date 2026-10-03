/**
 * Notifications screen with tabs for pending and history
 */
import { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Image,
    ActivityIndicator,
    Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/api';
import type { IncomingThrow, ThrowHistory } from '../../types';
import EmptyState from '../../components/EmptyState';

type Tab = 'pending' | 'history';

export default function NotificationsScreen({
    navigation,
}: {
    navigation: { goBack: () => void; navigate: (screen: string, params?: object) => void };
}) {
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState<Tab>('pending');
    const [processingThrowId, setProcessingThrowId] = useState<string | null>(
        null
    );

    const { data: incomingThrows = [], isLoading: isLoadingIncoming } =
        useQuery({
            queryKey: ['incoming-throws'],
            queryFn: () => apiClient.getIncomingThrows(),
        });

    const { data: throwHistory = [], isLoading: isLoadingHistory } = useQuery({
        queryKey: ['throw-history'],
        queryFn: () => {
            const res = apiClient.getThrowHistory();

            return res;
        },
    });

    const resolveMutation = useMutation({
        mutationFn: ({
            throwId,
            result,
        }: {
            throwId: string;
            result: 'hit' | 'miss';
        }) => apiClient.resolveThrow(throwId, result),
        onMutate: ({ throwId }) => {
            setProcessingThrowId(throwId);
        },
        onSuccess: (data) => {
            // Refresh both lists
            queryClient.invalidateQueries({ queryKey: ['incoming-throws'] });
            queryClient.invalidateQueries({ queryKey: ['throw-history'] });
            queryClient.invalidateQueries({ queryKey: ['nearby-users'] });

            if (data.matched) {
                // Refresh matches list if a match was created
                queryClient.invalidateQueries({ queryKey: ['matches'] });
            }
            setProcessingThrowId(null);
        },
        onError: (error) => {
            console.error('Failed to resolve throw:', error);
            setProcessingThrowId(null);
        },
    });

    const handleAccept = (throwId: string) => {
        resolveMutation.mutate({ throwId, result: 'hit' });
    };

    const handleDecline = (throwId: string) => {
        resolveMutation.mutate({ throwId, result: 'miss' });
    };

    const renderPendingItem = ({ item }: { item: IncomingThrow }) => {
        const isProcessing = processingThrowId === item.throwId;

        return (
            <View style={styles.notificationCard}>
                <View style={styles.cardContent}>
                    {item.thrower.avatarUrl ? (
                        <Image
                            source={{ uri: item.thrower.avatarUrl }}
                            style={styles.avatar}
                        />
                    ) : (
                        <View style={[styles.avatar, styles.avatarPlaceholder]}>
                            <Text style={styles.avatarText}>
                                {item.thrower.displayName
                                    .charAt(0)
                                    .toUpperCase()}
                            </Text>
                        </View>
                    )}

                    <View style={styles.textContent}>
                        <Text style={styles.displayName}>
                            {item.thrower.displayName}
                        </Text>
                        <Text style={styles.username}>
                            @{item.thrower.username}
                        </Text>
                        <Text style={styles.message}>
                            threw a pokeball at you!
                        </Text>
                    </View>
                </View>

                <View style={styles.actions}>
                    {isProcessing ? (
                        <ActivityIndicator size="small" color="#E63946" />
                    ) : (
                        <>
                            <TouchableOpacity
                                style={[styles.button, styles.declineButton]}
                                onPress={() => handleDecline(item.throwId)}
                            >
                                <Text style={styles.declineButtonText}>
                                    Dodge
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.button, styles.acceptButton]}
                                onPress={() => handleAccept(item.throwId)}
                            >
                                <Text style={styles.acceptButtonText}>
                                    Catch!
                                </Text>
                            </TouchableOpacity>
                        </>
                    )}
                </View>
            </View>
        );
    };

    const renderHistoryItem = ({ item }: { item: ThrowHistory }) => {
        const wasAccepted = item.status === 'hit';

        return (
            <Pressable
                onPress={
                    () => {
                        if(wasAccepted) navigation.navigate('PersonDetail', { userId: item.thrower.userId });
                    }
                }
            >
                <View style={styles.notificationCard}>
                    <View style={styles.cardContent}>
                        {item.thrower.avatarUrl ? (
                            <Image
                                source={{ uri: item.thrower.avatarUrl }}
                                style={styles.avatar}
                            />
                        ) : (
                            <View
                                style={[
                                    styles.avatar,
                                    styles.avatarPlaceholder,
                                ]}
                            >
                                <Text style={styles.avatarText}>
                                    {item.thrower.displayName
                                        .charAt(0)
                                        .toUpperCase()}
                                </Text>
                            </View>
                        )}

                        <View style={styles.textContent}>
                            <Text style={styles.displayName}>
                                {item.thrower.displayName}
                            </Text>
                            <Text style={styles.username}>
                                @{item.thrower.username}
                            </Text>
                            <Text style={styles.message}>
                                {item.isTarget
                                    ? 'threw a pokeball at you'
                                    : `${
                                          item.status === 'hit'
                                              ? 'caught'
                                              : 'dodged'
                                      } your pokeball`}
                            </Text>
                        </View>

                        <View
                            style={[
                                styles.statusBadge,
                                wasAccepted
                                    ? styles.acceptedBadge
                                    : styles.declinedBadge,
                            ]}
                        >
                            <Text style={styles.statusText}>
                                {wasAccepted ? 'Caught' : 'Dodged'}
                            </Text>
                        </View>
                    </View>
                </View>
            </Pressable>
        );
    };

    const isLoading =
        activeTab === 'pending' ? isLoadingIncoming : isLoadingHistory;

    if (isLoading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity
                        onPress={() => navigation.goBack()}
                        style={styles.backButton}
                    >
                        <Text style={styles.backButtonText}>← Back</Text>
                    </TouchableOpacity>
                    <Text style={styles.title}>Notifications</Text>
                    <View style={styles.placeholder} />
                </View>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#E63946" />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={styles.backButton}
                >
                    <Text style={styles.backButtonText}>← Back</Text>
                </TouchableOpacity>
                <Text style={styles.title}>Notifications</Text>
                <View style={styles.placeholder} />
            </View>

            {/* Tab Navigation */}
            <View style={styles.tabContainer}>
                <TouchableOpacity
                    style={[
                        styles.tab,
                        activeTab === 'pending' && styles.activeTab,
                    ]}
                    onPress={() => setActiveTab('pending')}
                >
                    <Text
                        style={[
                            styles.tabText,
                            activeTab === 'pending' && styles.activeTabText,
                        ]}
                    >
                        Pending
                    </Text>
                    {incomingThrows.length > 0 && (
                        <View style={styles.tabBadge}>
                            <Text style={styles.tabBadgeText}>
                                {incomingThrows.length}
                            </Text>
                        </View>
                    )}
                </TouchableOpacity>
                <TouchableOpacity
                    style={[
                        styles.tab,
                        activeTab === 'history' && styles.activeTab,
                    ]}
                    onPress={() => setActiveTab('history')}
                >
                    <Text
                        style={[
                            styles.tabText,
                            activeTab === 'history' && styles.activeTabText,
                        ]}
                    >
                        History
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Content */}
            {activeTab === 'pending' ? (
                <FlatList
                    data={incomingThrows}
                    keyExtractor={(item) => item.throwId}
                    renderItem={renderPendingItem}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <EmptyState
                            title=""
                            message="No pending notifications"
                        />
                    }
                />
            ) : (
                <FlatList
                    data={throwHistory}
                    keyExtractor={(item) => item.throwId}
                    renderItem={renderHistoryItem}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <EmptyState
                            title=""
                            message="No notification history"
                        />
                    }
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F1FAEE',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
    },
    backButton: {
        padding: 8,
    },
    backButtonText: {
        color: '#E63946',
        fontSize: 16,
        fontWeight: '600',
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1D3557',
    },
    placeholder: {
        width: 60,
    },
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
    },
    tab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        gap: 8,
    },
    activeTab: {
        borderBottomWidth: 3,
        borderBottomColor: '#E63946',
    },
    tabText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#457B9D',
    },
    activeTabText: {
        color: '#E63946',
    },
    tabBadge: {
        backgroundColor: '#E63946',
        borderRadius: 10,
        minWidth: 20,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 6,
    },
    tabBadgeText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: 'bold',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContent: {
        padding: 16,
    },
    notificationCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    cardContent: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        marginRight: 12,
    },
    avatarPlaceholder: {
        backgroundColor: '#457B9D',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        color: '#FFFFFF',
        fontSize: 20,
        fontWeight: 'bold',
    },
    textContent: {
        flex: 1,
    },
    displayName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1D3557',
        marginBottom: 2,
    },
    username: {
        fontSize: 14,
        color: '#457B9D',
        marginBottom: 4,
    },
    message: {
        fontSize: 14,
        color: '#1D3557',
    },
    actions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 8,
    },
    button: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 8,
        minWidth: 80,
        alignItems: 'center',
    },
    acceptButton: {
        backgroundColor: '#E63946',
    },
    acceptButtonText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
    },
    declineButton: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    declineButtonText: {
        color: '#1D3557',
        fontSize: 14,
        fontWeight: '600',
    },
    statusBadge: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 12,
    },
    acceptedBadge: {
        backgroundColor: '#A8DADC',
    },
    declinedBadge: {
        backgroundColor: '#E0E0E0',
    },
    statusText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#1D3557',
    },
});
