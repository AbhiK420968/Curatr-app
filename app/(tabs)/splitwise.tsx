import React, { useState, useMemo } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity, Image,
    Modal, TextInput, Alert, Switch
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, FontFamily, FontSize, Spacing, BorderRadius, Shadows } from '@/constants';
import { ChevronLeft, Plus, Users, ArrowRight, Receipt, X, Check } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';

// --- Types ---
type Member = { id: string; name: string; avatar: string };
type Expense = { id: string; title: string; amount: number; paidBy: string; splitAmong: string[]; date: string; isSettle?: boolean };

// --- Simplification Logic ---
const computeBalances = (members: Member[], expenses: Expense[]) => {
    const netBalances: Record<string, number> = {};
    members.forEach(m => netBalances[m.id] = 0);

    expenses.forEach(e => {
        if (netBalances[e.paidBy] !== undefined) {
             netBalances[e.paidBy] += e.amount;
        }
        const splitAmount = e.amount / e.splitAmong.length;
        e.splitAmong.forEach(userId => {
             if (netBalances[userId] !== undefined) {
                 netBalances[userId] -= splitAmount;
             }
        });
    });
    return netBalances;
};

const simplifyDebts = (netBalances: Record<string, number>) => {
    const debtors: { userId: string; amount: number }[] = [];
    const creditors: { userId: string; amount: number }[] = [];

    for (const [userId, amount] of Object.entries(netBalances)) {
        if (amount < -0.01) debtors.push({ userId, amount: -amount });
        else if (amount > 0.01) creditors.push({ userId, amount });
    }

    debtors.sort((a,b) => b.amount - a.amount);
    creditors.sort((a,b) => b.amount - a.amount);

    const transactions: { from: string; to: string; amount: number }[] = [];
    let i = 0, j = 0;
    while(i < debtors.length && j < creditors.length) {
        const debtor = debtors[i];
        const creditor = creditors[j];
        const min = Math.min(debtor.amount, creditor.amount);
        
        if (min > 0.01) {
            transactions.push({ from: debtor.userId, to: creditor.userId, amount: min });
        }
        
        debtor.amount -= min;
        creditor.amount -= min;
        
        if (debtor.amount < 0.01) i++;
        if (creditor.amount < 0.01) j++;
    }
    return transactions;
};

export default function SplitwiseScreen() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<'expenses' | 'balances'>('balances');

    const [members, setMembers] = useState<Member[]>([
        { id: '1', name: 'You', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200&auto=format&fit=crop' },
        { id: '2', name: 'Sarah', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=200&auto=format&fit=crop' },
    ]);

    const [expenses, setExpenses] = useState<Expense[]>([
        { id: 'e1', title: 'Hotel Booking', amount: 450, paidBy: '1', splitAmong: ['1', '2'], date: 'Today' },
        { id: 'e2', title: 'Dinner', amount: 120, paidBy: '2', splitAmong: ['1', '2'], date: 'Yesterday' },
    ]);

    // Modals state
    const [showAddFriend, setShowAddFriend] = useState(false);
    const [newFriendName, setNewFriendName] = useState('');

    const [showAddExpense, setShowAddExpense] = useState(false);
    const [expTitle, setExpTitle] = useState('');
    const [expAmount, setExpAmount] = useState('');
    const [expPayer, setExpPayer] = useState('1');
    const [expSplit, setExpSplit] = useState<Record<string, boolean>>({ '1': true, '2': true });

    // Derived states
    const netBalances = useMemo(() => computeBalances(members, expenses), [members, expenses]);
    const transactions = useMemo(() => simplifyDebts(netBalances), [netBalances]);
    const totalCost = expenses.filter(e => !e.isSettle).reduce((acc, curr) => acc + curr.amount, 0);
    const yourBalance = netBalances['1'] || 0;

    // --- Actions ---
    const handleAddFriend = () => {
        if (!newFriendName.trim()) return;
        const newId = Date.now().toString();
        setMembers([...members, { 
            id: newId, 
            name: newFriendName.trim(), 
            avatar: `https://i.pravatar.cc/150?u=${newId}` 
        }]);
        setExpSplit(prev => ({ ...prev, [newId]: true }));
        setNewFriendName('');
        setShowAddFriend(false);
    };

    const handleAddExpense = () => {
        if (!expTitle.trim() || !expAmount || isNaN(Number(expAmount))) {
            Alert.alert("Invalid input", "Please provide a valid title and amount.");
            return;
        }
        const splitAmong = Object.keys(expSplit).filter(id => expSplit[id]);
        if (splitAmong.length === 0) {
            Alert.alert("Invalid input", "Please select at least one person to split the expense.");
            return;
        }

        const newExp: Expense = {
            id: Date.now().toString(),
            title: expTitle.trim(),
            amount: Number(expAmount),
            paidBy: expPayer,
            splitAmong,
            date: new Date().toLocaleDateString(),
        };

        setExpenses([newExp, ...expenses]);
        setExpTitle('');
        setExpAmount('');
        setShowAddExpense(false);
    };

    const handleSettleUp = (tx: { from: string, to: string, amount: number }) => {
        Alert.alert(
            "Settle Up",
            `Mark $${tx.amount.toFixed(2)} as paid from ${members.find(m => m.id === tx.from)?.name} to ${members.find(m => m.id === tx.to)?.name}?`,
            [
                { text: "Cancel", style: "cancel" },
                { 
                    text: "Settle", 
                    style: "default",
                    onPress: () => {
                        // Settle means 'from' pays 'to'. So the 'from' person covers an expense split only for the 'to' person.
                        const settleExp: Expense = {
                            id: Date.now().toString(),
                            title: 'Settlement',
                            amount: tx.amount,
                            paidBy: tx.from,
                            splitAmong: [tx.to], // Since 'tx.from' paid this explicitly FOR 'tx.to' to clear debt
                            date: new Date().toLocaleDateString(),
                            isSettle: true,
                        };
                        setExpenses([settleExp, ...expenses]);
                    }
                }
            ]
        );
    };

    const isAllSplit = Object.values(expSplit).every(v => v);
    const toggleSplitAll = () => {
        const newValue = !isAllSplit;
        const newSplit: Record<string, boolean> = {};
        members.forEach(m => newSplit[m.id] = newValue);
        setExpSplit(newSplit);
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.backButton} />
                <Text style={styles.headerTitle}>Trip Expenses</Text>
                <TouchableOpacity style={styles.addButton} onPress={() => setShowAddFriend(true)}>
                    <Users size={20} color={Colors.primary} />
                </TouchableOpacity>
            </View>

            {/* Total Balance Overview */}
            <View style={styles.overviewCard}>
                <View style={styles.overviewHeader}>
                    <Text style={styles.overviewTitle}>Total Trip Cost</Text>
                    <Text style={styles.overviewAmount}>${totalCost.toFixed(2)}</Text>
                </View>
                <View style={styles.overviewFooter}>
                    <Text style={styles.overviewSubtitle}>
                        {yourBalance > 0 
                            ? <Text>You are owed <Text style={styles.greenText}>${yourBalance.toFixed(2)}</Text> overall</Text> 
                            : yourBalance < 0 
                                ? <Text>You owe <Text style={styles.redText}>${Math.abs(yourBalance).toFixed(2)}</Text> overall</Text>
                                : 'You are completely settled up.'}
                    </Text>
                </View>

                {/* Group Members Mini */}
                <View style={styles.membersContainer}>
                    {members.slice(0, 4).map((member, i) => (
                        <Image
                            key={member.id}
                            source={{ uri: member.avatar }}
                            style={[styles.memberAvatar, { left: i * -15, zIndex: 10 - i }]}
                        />
                    ))}
                    {members.length > 4 && (
                        <View style={[styles.memberAvatarCta, { left: 4 * -15 }]}>
                             <Text style={{color: Colors.onPrimaryContainer, fontSize: 10, fontFamily: FontFamily.bold}}>+{members.length - 4}</Text>
                        </View>
                    )}
                </View>
            </View>

            {/* Tabs */}
            <View style={styles.tabsContainer}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'balances' && styles.tabActive]}
                    onPress={() => setActiveTab('balances')}
                >
                    <Text style={[styles.tabText, activeTab === 'balances' && styles.tabTextActive]}>Settle Up</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'expenses' && styles.tabActive]}
                    onPress={() => setActiveTab('expenses')}
                >
                    <Text style={[styles.tabText, activeTab === 'expenses' && styles.tabTextActive]}>Expenses</Text>
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {activeTab === 'balances' ? (
                    <View style={styles.balancesList}>
                        <Text style={styles.sectionTitle}>Optimized Balances</Text>
                        {transactions.length === 0 ? (
                            <Text style={styles.emptyText}>Everyone is settled up! 🎉</Text>
                        ) : (
                            transactions.map((tx, idx) => {
                                const fromUser = members.find(m => m.id === tx.from);
                                const toUser = members.find(m => m.id === tx.to);
                                const isYouFrom = tx.from === '1';
                                const isYouTo = tx.to === '1';

                                return (
                                    <View key={idx} style={styles.balanceCard}>
                                        <Image source={{ uri: fromUser?.avatar }} style={styles.balanceAvatarSmall} />
                                        <View style={styles.balanceInfo}>
                                            <Text style={styles.balanceName}>
                                                {isYouFrom ? 'You' : fromUser?.name} owe{isYouFrom ? '' : 's'} {isYouTo ? 'You' : toUser?.name}
                                            </Text>
                                            <Text style={[styles.balanceAmountText, { color: isYouTo ? Colors.primary : Colors.textSecondary }]}>
                                                <Text style={[styles.balanceAmountBold, {color: isYouFrom ? '#F43F5E' : isYouTo ? Colors.primary : Colors.text}]}>
                                                    ${tx.amount.toFixed(2)}
                                                </Text>
                                            </Text>
                                        </View>
                                        <TouchableOpacity style={styles.settleButtonContainer} onPress={() => handleSettleUp(tx)} activeOpacity={0.8}>
                                            <View style={styles.settleButtonBlur}>
                                                <Text style={styles.settleButtonText}>Settle</Text>
                                            </View>
                                        </TouchableOpacity>
                                    </View>
                                );
                            })
                        )}
                    </View>
                ) : (
                    <View style={styles.expensesList}>
                        <View style={styles.expensesHeader}>
                            <Text style={styles.sectionTitle}>Recent Expenses</Text>
                            <TouchableOpacity style={styles.addExpenseBtn} onPress={() => setShowAddExpense(true)}>
                                <Plus size={16} color="#FFF" />
                                <Text style={styles.addExpenseBtnText}>Add</Text>
                            </TouchableOpacity>
                        </View>
                        {expenses.length === 0 && <Text style={styles.emptyText}>No expenses yet.</Text>}
                        {expenses.map(expense => {
                            const payer = members.find(m => m.id === expense.paidBy);
                            return (
                                <View key={expense.id} style={styles.expenseCard}>
                                    <View style={[styles.expenseIconWrapper, expense.isSettle && { backgroundColor: Colors.primaryContainer }]}>
                                        {expense.isSettle ? <Check size={20} color={Colors.primary} /> : <Receipt size={20} color={Colors.primary} />}
                                    </View>
                                    <View style={styles.expenseInfo}>
                                        <Text style={styles.expenseTitle}>{expense.title}</Text>
                                        <Text style={styles.expenseMeta}>
                                            {payer?.id === '1' ? 'You' : payer?.name} paid • {expense.splitAmong.length < members.length ? 'Split equally' : 'Group'}
                                        </Text>
                                    </View>
                                    <View style={styles.expenseAmountWrapper}>
                                        <Text style={[styles.expenseCost, expense.isSettle && { color: Colors.primary }]}>
                                            ${expense.amount.toFixed(2)}
                                        </Text>
                                    </View>
                                </View>
                            )
                        })}
                    </View>
                )}
            </ScrollView>

            {/* --- Modals --- */}
            
            {/* Add Friend Modal */}
            <Modal visible={showAddFriend} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Add Friend</Text>
                            <TouchableOpacity onPress={() => setShowAddFriend(false)}>
                                <X size={24} color={Colors.textSecondary} />
                            </TouchableOpacity>
                        </View>
                        <TextInput
                            style={styles.modalInput}
                            placeholder="Friend's Name"
                            value={newFriendName}
                            onChangeText={setNewFriendName}
                            autoFocus
                        />
                        <TouchableOpacity style={styles.modalButton} onPress={handleAddFriend}>
                            <Text style={styles.modalButtonText}>Add to Trip</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Add Expense Modal */}
            <Modal visible={showAddExpense} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalScrollContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Add Expense</Text>
                            <TouchableOpacity onPress={() => setShowAddExpense(false)}>
                                <X size={24} color={Colors.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.modalLabel}>Description</Text>
                        <TextInput
                            style={styles.modalInput}
                            placeholder="Dinner, Flights, etc."
                            value={expTitle}
                            onChangeText={setExpTitle}
                        />

                        <Text style={styles.modalLabel}>Amount ($)</Text>
                        <TextInput
                            style={styles.modalInput}
                            placeholder="0.00"
                            keyboardType="numeric"
                            value={expAmount}
                            onChangeText={setExpAmount}
                        />

                        <Text style={styles.modalLabel}>Who paid?</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: Spacing.lg }}>
                            {members.map(m => (
                                <TouchableOpacity 
                                    key={m.id} 
                                    style={[styles.payerChip, expPayer === m.id && styles.payerChipActive]}
                                    onPress={() => setExpPayer(m.id)}
                                >
                                    <Image source={{ uri: m.avatar }} style={styles.chipAvatar} />
                                    <Text style={[styles.chipText, expPayer === m.id && styles.chipTextActive]}>
                                        {m.id === '1' ? 'You' : m.name}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        <Text style={styles.modalLabel}>Split among</Text>
                        <TouchableOpacity style={styles.splitAllToggle} onPress={toggleSplitAll}>
                            <Text style={styles.splitAllText}>{isAllSplit ? 'Deselect All' : 'Select All'}</Text>
                        </TouchableOpacity>
                        
                        <View style={styles.splitList}>
                            {members.map(m => (
                                <View key={m.id} style={styles.splitItem}>
                                    <View style={{flexDirection:'row', alignItems:'center'}}>
                                        <Image source={{ uri: m.avatar }} style={styles.chipAvatar} />
                                        <Text style={styles.splitName}>{m.id === '1' ? 'You' : m.name}</Text>
                                    </View>
                                    <Switch 
                                        value={expSplit[m.id] || false} 
                                        onValueChange={(val) => setExpSplit(prev => ({...prev, [m.id]: val}))}
                                        trackColor={{ true: Colors.primaryContainer, false: Colors.border }}
                                        thumbColor={expSplit[m.id] ? Colors.primary : Colors.borderLight}
                                    />
                                </View>
                            ))}
                        </View>

                        <TouchableOpacity style={styles.modalButton} onPress={handleAddExpense}>
                            <Text style={styles.modalButtonText}>Save Expense</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.lg,
    },
    headerTitle: {
        fontFamily: FontFamily.bold, fontSize: FontSize.xl, color: Colors.text,
    },
    backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-start' },
    addButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-end' },
    
    overviewCard: {
        marginHorizontal: Spacing.lg, backgroundColor: Colors.surface, borderRadius: BorderRadius.xxl,
        padding: Spacing.xl, ...Shadows.md, marginBottom: Spacing.xl,
    },
    overviewHeader: { marginBottom: Spacing.sm },
    overviewTitle: { fontFamily: FontFamily.medium, fontSize: FontSize.sm, color: Colors.textSecondary, marginBottom: 4 },
    overviewAmount: { fontFamily: FontFamily.bold, fontSize: 36, color: Colors.text, letterSpacing: -1 },
    overviewFooter: { marginTop: 4 },
    overviewSubtitle: { fontFamily: FontFamily.medium, fontSize: FontSize.sm, color: Colors.textMuted },
    greenText: { color: Colors.primary, fontFamily: FontFamily.bold },
    redText: { color: '#F43F5E', fontFamily: FontFamily.bold },
    
    membersContainer: { flexDirection: 'row', position: 'absolute', top: Spacing.xl, right: Spacing.xl },
    memberAvatar: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: Colors.surface },
    memberAvatarCta: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.primaryContainer, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: Colors.surface },
    
    tabsContainer: { flexDirection: 'row', paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md, gap: Spacing.md },
    tab: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, backgroundColor: 'transparent' },
    tabActive: { backgroundColor: Colors.surface, ...Shadows.sm },
    tabText: { fontFamily: FontFamily.medium, fontSize: FontSize.base, color: Colors.textMuted },
    tabTextActive: { fontFamily: FontFamily.bold, color: Colors.text },
    
    scroll: { flex: 1 },
    scrollContent: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing['3xl'], paddingTop: Spacing.sm },
    sectionTitle: { fontFamily: FontFamily.bold, fontSize: FontSize.lg, color: Colors.text, marginBottom: Spacing.sm },
    
    emptyText: { fontFamily: FontFamily.medium, fontSize: FontSize.base, color: Colors.textSecondary, marginTop: Spacing.xl, textAlign: 'center' },
    
    balancesList: { gap: Spacing.md },
    balanceCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, padding: Spacing.md, borderRadius: BorderRadius.xl, ...Shadows.sm, shadowOpacity: 0.05 },
    balanceAvatarSmall: { width: 40, height: 40, borderRadius: 20, marginRight: Spacing.md },
    balanceInfo: { flex: 1 },
    balanceName: { fontFamily: FontFamily.medium, fontSize: FontSize.base, color: Colors.textSecondary, marginBottom: 2 },
    balanceAmountText: { fontFamily: FontFamily.medium, fontSize: FontSize.sm },
    balanceAmountBold: { fontFamily: FontFamily.bold, fontSize: FontSize.lg },
    
    settleButtonContainer: { borderRadius: 18, overflow: 'hidden', height: 36, backgroundColor: Colors.primary },
    settleButtonBlur: { paddingHorizontal: 16, height: '100%', justifyContent: 'center', alignItems: 'center' },
    settleButtonText: { fontFamily: FontFamily.bold, fontSize: FontSize.sm, color: '#FFFFFF' },
    
    expensesHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
    addExpenseBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, gap: 4 },
    addExpenseBtnText: { fontFamily: FontFamily.bold, color: '#FFF', fontSize: FontSize.sm },
    
    expensesList: { gap: Spacing.md },
    expenseCard: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
    expenseIconWrapper: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.surfaceContainerHighest, justifyContent: 'center', alignItems: 'center', marginRight: Spacing.md },
    expenseInfo: { flex: 1 },
    expenseTitle: { fontFamily: FontFamily.semiBold, fontSize: FontSize.base, color: Colors.text, marginBottom: 2 },
    expenseMeta: { fontFamily: FontFamily.regular, fontSize: FontSize.sm, color: Colors.textMuted },
    expenseAmountWrapper: { alignItems: 'flex-end' },
    expenseCost: { fontFamily: FontFamily.bold, fontSize: FontSize.base, color: Colors.text },

    // Modals
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: Colors.background, borderTopLeftRadius: BorderRadius.xxl, borderTopRightRadius: BorderRadius.xxl, padding: Spacing.xl, paddingBottom: 40 },
    modalScrollContent: { backgroundColor: Colors.background, borderTopLeftRadius: BorderRadius.xxl, borderTopRightRadius: BorderRadius.xxl, padding: Spacing.xl, paddingBottom: 40, maxHeight: '90%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.xl },
    modalTitle: { fontFamily: FontFamily.bold, fontSize: FontSize.xl, color: Colors.text },
    modalInput: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.borderLight, borderRadius: BorderRadius.lg, padding: Spacing.md, fontFamily: FontFamily.medium, fontSize: FontSize.base, marginBottom: Spacing.xl },
    modalLabel: { fontFamily: FontFamily.semiBold, fontSize: FontSize.sm, color: Colors.textSecondary, marginBottom: Spacing.sm },
    modalButton: { backgroundColor: Colors.primary, padding: Spacing.md, borderRadius: BorderRadius.xl, alignItems: 'center', marginTop: Spacing.xl },
    modalButtonText: { fontFamily: FontFamily.bold, fontSize: FontSize.base, color: '#FFF' },
    
    payerChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, padding: 8, paddingRight: 16, borderRadius: 24, marginRight: 8, borderWidth: 1, borderColor: Colors.borderLight },
    payerChipActive: { backgroundColor: Colors.primaryContainer, borderColor: Colors.primary },
    chipAvatar: { width: 24, height: 24, borderRadius: 12, marginRight: 8 },
    chipText: { fontFamily: FontFamily.medium, fontSize: FontSize.sm, color: Colors.textSecondary },
    chipTextActive: { color: Colors.primaryDark, fontFamily: FontFamily.bold },

    splitAllToggle: { alignSelf: 'flex-end', marginBottom: 8 },
    splitAllText: { fontFamily: FontFamily.medium, color: Colors.primary, fontSize: FontSize.sm },
    splitList: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, overflow: 'hidden', borderWidth: 1, borderColor: Colors.borderLight },
    splitItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.borderLight },
    splitName: { fontFamily: FontFamily.medium, fontSize: FontSize.base, color: Colors.text },
});
