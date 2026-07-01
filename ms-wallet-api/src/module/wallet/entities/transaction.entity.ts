// wallet/entities/transaction.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne } from 'typeorm';
import { TransactionType } from '../enums/transaction-type.enum';
import { TransactionStatus } from '../enums/transaction-status.enum';
import { Wallet } from './wallet.entity';


@Entity('transactions')
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ type: 'varchar' })
  type: TransactionType;

  @Column({ type: 'varchar', default: TransactionStatus.PENDING })
  status: TransactionStatus;

  @Column({ nullable: true })
  relatedTransactionId: string;

  @Column({ nullable: true })
  targetWalletId: string; 

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => Wallet, (w) => w.transactions)
  wallet: Wallet;

  @Column()
  walletId: string;

  isForbiddenToReverse(): boolean {
    return this.type === TransactionType.REVERSAL && this.status === TransactionStatus.REVERSED;
  }

  isCompleted(): boolean {
    return this.status === TransactionStatus.COMPLETED;
  }
}